import argparse
from pathlib import Path

import geopandas as gpd
import pandas as pd
from tqdm import tqdm

from packages.database.connection import get_db_connection
from packages.jobs.utils.rastreio import registrar_status, gerar_import_id
from packages.jobs.utils.sanitize import sanitize_int
from packages.jobs.importers.common_import_utils import (
    detectar_layer,
    gerar_uc_id,
    copy_to_table,
    normalizar_dataframe_para_tabelas,
)

def importar_ucat(gdb_path: Path, distribuidora: str, ano: int, prefixo: str, modo_debug: bool = False):
    camada = "UCAT"
    registrar_status(prefixo, ano, camada, "running")
    import_id = gerar_import_id(prefixo, ano, camada)

    try:
        layer = detectar_layer(gdb_path, camada)
        if not layer:
            raise Exception("Camada UCAT não encontrada no GDB.")

        tqdm.write(f" Lendo camada '{layer}'...")
        gdf = gpd.read_file(str(gdb_path), layer=layer)

        if len(gdf) == 0:
            registrar_status(prefixo, ano, camada, "no_new_rows")
            return

        gdf.replace(["None", "nan", "", "***", "-"], None, inplace=True)
        sujas = gdf.columns[gdf.astype(str).apply(lambda col: col.str.contains("106022|YEL", na=False)).any()]
        gdf.drop(columns=sujas, inplace=True)

        dist_id = sanitize_int(gdf["DIST"]).dropna().unique()
        if len(dist_id) != 1:
            raise ValueError(f"Esperado um único código de distribuidora, mas encontrei: {dist_id}")
        dist_id = int(dist_id[0])

        # Construção dos campos por mês
        campos_energia = []
        for mes in range(1, 13):
            campos_energia.append([
                "COD_ID", mes,
                f"ENE_P_{mes:02d}",
                f"ENE_F_{mes:02d}",
                None  # total será calculado
            ])

        campos_qualidade = []
        for mes in range(1, 13):
            campos_qualidade.append([
                "COD_ID", mes,
                f"DIC_{mes:02d}",
                f"FIC_{mes:02d}",
                "SEMRED"
            ])

        campos_demanda = []
        for mes in range(1, 13):
            campos_demanda.append([
                "COD_ID", mes,
                f"DEM_P_{mes:02d}",
                f"DEM_F_{mes:02d}",
                "DEM_CONT",
                None  # total será calculado
            ])

        tqdm.write(" Transformando UCAT para tabelas normalizadas...")
        df_bruto, df_energia, df_qualidade, df_demanda = normalizar_dataframe_para_tabelas(
            gdf, ano, camada, dist_id, import_id,
            campos_energia=campos_energia,
            campos_qualidade=campos_qualidade,
            campos_demanda=campos_demanda
        )

        with get_db_connection() as conn:
            copy_to_table(conn, df_bruto, "lead_bruto")

        with get_db_connection() as conn:
            df_ids = pd.read_sql(
                "SELECT id AS lead_bruto_id, uc_id FROM lead_bruto WHERE import_id = %s",
                conn, params=(import_id,)
            )

        df_energia = df_energia.merge(df_ids, on="uc_id").drop(columns=["uc_id"])
        df_qualidade = df_qualidade.merge(df_ids, on="uc_id").drop(columns=["uc_id"])
        df_demanda = df_demanda.merge(df_ids, on="uc_id").drop(columns=["uc_id"])

        with get_db_connection() as conn:
            copy_to_table(conn, df_energia, "lead_energia_mensal")
            copy_to_table(conn, df_qualidade, "lead_qualidade_mensal")
            copy_to_table(conn, df_demanda, "lead_demanda_mensal")

        registrar_status(prefixo, ano, camada, "completed")
        tqdm.write(" Importação UCAT finalizada com sucesso!")

    except Exception as e:
        tqdm.write(f" Erro ao importar UCAT: {e}")
        registrar_status(prefixo, ano, camada, "failed", erro=str(e))
        if modo_debug:
            raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--gdb", required=True, type=Path)
    parser.add_argument("--ano", required=True, type=int)
    parser.add_argument("--distribuidora", required=True)
    parser.add_argument("--prefixo", required=True)
    parser.add_argument("--modo_debug", action="store_true")

    args = parser.parse_args()

    importar_ucat(
        gdb_path=args.gdb,
        distribuidora=args.distribuidora,
        ano=args.ano,
        prefixo=args.prefixo,
        modo_debug=args.modo_debug
    )
