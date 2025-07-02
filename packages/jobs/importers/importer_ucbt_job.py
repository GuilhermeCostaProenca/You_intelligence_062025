#!/usr/bin/env python3
import os
import io
import time
import uuid
import pandas as pd
import fiona
from fiona import listlayers
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
from tqdm import tqdm
from packages.database.connection import get_db_cursor

load_dotenv()
DB_SCHEMA = os.getenv("DB_SCHEMA", "plead")

CHUNK_SIZE = 500_000

def _to_pg_array(data):
    return pd.Series([
        "{" + ",".join(map(str, row)) + "}" if len(row) else "{}"
        for row in data
    ])


def normalizar_cep(cep):
    return ''.join(filter(str.isdigit, str(cep)))[:8] if cep else ""


def carregar_com_progresso(gdb_path: Path, layer: str) -> pd.DataFrame:
    """
    Carrega elementos da camada sem geometria com barra de progresso, usando Fiona.
    """
    with fiona.open(str(gdb_path), layer=layer) as src:
        total = len(src)
        print(f"🔍 Camada '{layer}' possui {total} feições")
        props = []
        for feat in tqdm(src, total=total, desc="Lendo feições", ncols=80):
            props.append(feat["properties"])
    return pd.DataFrame(props)


def chunked_copy(cur, df: pd.DataFrame, table: str, cols: list[str]):
    """Realiza COPY em chunks para não sobrecarregar."""
    total = len(df)
    for start in range(0, total, CHUNK_SIZE):
        end = min(start + CHUNK_SIZE, total)
        print(f"   - Copiando linhas {start} a {end} em {table}")
        buf = io.StringIO()
        df.iloc[start:end][cols].to_csv(buf, index=False, header=False, na_rep='\\N')
        buf.seek(0)
        cur.copy_expert(
            f"COPY {table} ({','.join(cols)}) FROM STDIN WITH (FORMAT csv, NULL '\\N')",
            buf
        )


def main(
    gdb_path: Path,
    distribuidora: str,
    ano: int,
    prefixo: str,
    camada: str = "UCBT_tab",
    modo_debug: bool = False
):
    print(f"🔄 Iniciando importação: {camada} | {distribuidora} {ano}")
    print(f"🚨 DEBUG MODE: {modo_debug}")

    # 1) leitura
    if camada not in listlayers(str(gdb_path)):
        print(f"❌ Camada '{camada}' não encontrada em {gdb_path}")
        return
    start = datetime.now()
    df = carregar_com_progresso(gdb_path, camada)
    print(f"📥 Leitura concluída: {len(df)} linhas em {(datetime.now() - start).total_seconds():.2f}s")

    # 2) transformações
    print("🛠️ Aplicando transformações...")
    t0 = datetime.now()
    df["CEP"] = df.get("CEP", "").astype(str).apply(normalizar_cep)
    df["id_interno"] = prefixo + "_" + df.get("COD_ID", "").astype(str) + "_" + str(ano)
    df["uc_id"] = [str(uuid.uuid4()) for _ in range(len(df))]
    print(f"✅ Transformações concluídas em {(datetime.now() - t0).total_seconds():.2f}s")
    if modo_debug:
        print(df.head())
        return

    # 3) preparar leads
    df_lead = (
        df[["id_interno","CEP","BRR","MUN"]]
        .drop_duplicates("id_interno")
        .rename(columns={"BRR":"bairro","MUN":"municipio_ibge","CEP":"cep"})
    )
    df_lead["id"] = df_lead["id_interno"]
    df_lead["distribuidora"] = distribuidora
    df_lead["status"] = "raw"
    df_lead["ultima_atualizacao"] = datetime.utcnow()
    cols_lead = ["id","id_interno","bairro","cep","municipio_ibge","distribuidora","status","ultima_atualizacao"]
    print(f"🔎 Leads únicos: {len(df_lead)}")

    # 4) preparar unidade consumidora
    df_uc = pd.DataFrame({
        "id": df["uc_id"],
        "cod_id": df.get("COD_ID"),
        "lead_id": df["id_interno"],
        "origem": camada,
        "ano": ano,
        "data_conexao": pd.to_datetime(df.get("DAT_CON"), errors="coerce"),
        "tipo_sistema": df.get("TIP_SIST"),
        "grupo_tensao": df.get("GRU_TEN"),
        "modalidade": df.get("GRU_TAR"),
        "situacao": df.get("SIT_ATIV"),
        "classe": df.get("CLAS_SUB"),
        "segmento": df.get("CONJ"),
        "subestacao": df.get("SUB"),
        "cnae": df.get("CNAE"),
        "descricao": df.get("DESCR"),
        "potencia": df.get("PN_CON").fillna(0).astype(float)
    })
    cols_uc = list(df_uc.columns)
    print(f"🔎 UC total: {len(df_uc)}")

    # 5) preparar séries
    ene = df[[c for c in df.columns if c.startswith("ENE_")]].fillna(0).astype(int).values
    dem_p = df[[c for c in df.columns if c.startswith("DEM_P_")]].fillna(0).astype(int).values
    dem_f = df[[c for c in df.columns if c.startswith("DEM_F_")]].fillna(0).astype(int).values
    dic = df[[c for c in df.columns if c.startswith("DIC_")]].fillna(0).astype(int).values
    fic = df[[c for c in df.columns if c.startswith("FIC_")]].fillna(0).astype(int).values
    df_energia = pd.DataFrame({"id": df["uc_id"], "uc_id": df["uc_id"], "ene": _to_pg_array(ene)})
    df_demanda = pd.DataFrame({"id": df["uc_id"], "uc_id": df["uc_id"], "dem_ponta": _to_pg_array(dem_p), "dem_fora_ponta": _to_pg_array(dem_f)})
    df_qualidade = pd.DataFrame({"id": df["uc_id"], "uc_id": df["uc_id"], "dic": _to_pg_array(dic), "fic": _to_pg_array(fic)})
    cols_energia = list(df_energia.columns)
    cols_demanda = list(df_demanda.columns)
    cols_qualidade = list(df_qualidade.columns)
    print(f"🔎 Séries: energia={len(df_energia)}, demanda={len(df_demanda)}, qualidade={len(df_qualidade)}")

    # 6) carga otimizada com chunk + select para evitar duplicados
    print("🚀 Iniciando carga no banco…")
    t0 = time.time()
    with get_db_cursor(commit=True) as cur:
        # filtrar leads
        cur.execute(f"SELECT id FROM {DB_SCHEMA}.lead WHERE id = ANY(%s)", (df_lead['id'].tolist(),))
        existing_leads = {r[0] for r in cur.fetchall()}
        new_leads = df_lead[~df_lead['id'].isin(existing_leads)]
        print(f"   - Leads para inserir: {len(new_leads)}")
        if len(new_leads):
            chunked_copy(cur, new_leads, f"{DB_SCHEMA}.lead", cols_lead)

        # filtrar uc
        cur.execute(f"SELECT cod_id FROM {DB_SCHEMA}.unidade_consumidora WHERE cod_id = ANY(%s)", (df_uc['cod_id'].tolist(),))
        existing_uc = {r[0] for r in cur.fetchall()}
        new_uc = df_uc[~df_uc['cod_id'].isin(existing_uc)]
        print(f"   - UC para inserir: {len(new_uc)}")
        if len(new_uc):
            chunked_copy(cur, new_uc, f"{DB_SCHEMA}.unidade_consumidora", cols_uc)

        # filtrar energia
        cur.execute(f"SELECT uc_id FROM {DB_SCHEMA}.lead_energia WHERE uc_id = ANY(%s)", (df_energia['uc_id'].tolist(),))
        existing_eng = {r[0] for r in cur.fetchall()}
        new_eng = df_energia[~df_energia['uc_id'].isin(existing_eng)]
        print(f"   - Energia para inserir: {len(new_eng)}")
        if len(new_eng):
            chunked_copy(cur, new_eng, f"{DB_SCHEMA}.lead_energia", cols_energia)

        # filtrar demanda
        cur.execute(f"SELECT uc_id FROM {DB_SCHEMA}.lead_demanda WHERE uc_id = ANY(%s)", (df_demanda['uc_id'].tolist(),))
        existing_dem = {r[0] for r in cur.fetchall()}
        new_dem = df_demanda[~df_demanda['uc_id'].isin(existing_dem)]
        print(f"   - Demanda para inserir: {len(new_dem)}")
        if len(new_dem):
            chunked_copy(cur, new_dem, f"{DB_SCHEMA}.lead_demanda", cols_demanda)

        # filtrar qualidade
        cur.execute(f"SELECT uc_id FROM {DB_SCHEMA}.lead_qualidade WHERE uc_id = ANY(%s)", (df_qualidade['uc_id'].tolist(),))
        existing_qual = {r[0] for r in cur.fetchall()}
        new_qual = df_qualidade[~df_qualidade['uc_id'].isin(existing_qual)]
        print(f"   - Qualidade para inserir: {len(new_qual)}")
        if len(new_qual):
            chunked_copy(cur, new_qual, f"{DB_SCHEMA}.lead_qualidade", cols_qualidade)

        # status
        cur.execute(
            f"INSERT INTO {DB_SCHEMA}.import_status(distribuidora,ano,camada,status)"
            " VALUES(%s,%s,%s,'success') ON CONFLICT(distribuidora,ano,camada) DO UPDATE SET status=EXCLUDED.status,data_execucao=now()",
            (distribuidora, ano, camada)
        )
    print(f"📤 Carga finalizada em {time.time() - t0:.2f}s — {camada} importado com sucesso!")
