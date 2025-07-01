from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class LeadOut(BaseModel):
    id: str
    nome_estabelecimento: Optional[str] = None
    cnpj: Optional[str] = None
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    natureza_juridica: Optional[str] = None
    cnae_principal: Optional[str] = None
    classe: Optional[str] = None
    grupo_tensao: Optional[str] = None
    modalidade: Optional[str] = None
    estado: Optional[str] = None
    municipio: Optional[str] = None
    distribuidora: Optional[str] = None
    potencia: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    segmento: Optional[str] = None
    status: Optional[str] = None
    cnae: Optional[str] = None
    dicMed: Optional[float] = None
    ficMed: Optional[float] = None
    dicMes: Optional[List[float]] = None
    ficMes: Optional[List[float]] = None

class LeadList(BaseModel):
    total: int
    items: List[LeadOut]

class LeadDetail(LeadOut):
    data_conexao: Optional[datetime] = None
    descricao: Optional[str] = None


class LeadQualidade(BaseModel):
    dicMed: Optional[float] = None
    ficMed: Optional[float] = None
    dicMes: Optional[List[float]] = None
    ficMes: Optional[List[float]] = None

class LeadMapOut(BaseModel):
    id: str
    latitude: float
    longitude: float
    classe: Optional[str] = None
    grupo_tensao: Optional[str] = None
    potencia: Optional[float] = None
    distribuidora: Optional[str] = None
    status: Optional[str] = None


class LeadResumo(BaseModel):
    total_leads: int
    total_com_cnpj: int
    total_enriquecidos: int
    media_consumo: Optional[float] = None
    media_potencia: Optional[float] = None
    por_classe: dict[str, int]

class GeoGoogleOut(BaseModel):
    nome_estabelecimento: Optional[str] = None
    endereco_formatado: Optional[str] = None
    telefone: Optional[str] = None
    site: Optional[str] = None
    atualizado_em: Optional[datetime] = None

class ImportStatusOut(BaseModel):
    distribuidora: str
    ano: int
    camada: str
    status: str
    data_execucao: datetime

