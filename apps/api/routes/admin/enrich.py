from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess
import uuid

router = APIRouter(prefix="/v1/admin/enrich", tags=["admin-enrich"])

class EnrichPayload(BaseModel):
    lead_ids: list[str]

@router.post("/geo")
async def enrich_google(payload: EnrichPayload):
    try:
        id_exec = str(uuid.uuid4())[:8]
        print(f"🌍 [{id_exec}] Enriquecendo via Google: {len(payload.lead_ids)} leads")

        subprocess.run([
            "python", "packages/jobs/enrichers/geo_google.py",
            "--ids", ",".join(payload.lead_ids)
        ], check=True)

        return {"status": "ok", "exec_id": id_exec}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro no enriquecimento geo: {str(e)}")


@router.post("/cnpj")
async def enrich_cnpj(payload: EnrichPayload):
    try:
        id_exec = str(uuid.uuid4())[:8]
        print(f"📇 [{id_exec}] Enriquecendo via CNPJ: {len(payload.lead_ids)} leads")

        subprocess.run([
            "python", "packages/jobs/enrichers/cnpj_enrichment.py",
            "--ids", ",".join(payload.lead_ids)
        ], check=True)

        return {"status": "ok", "exec_id": id_exec}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro no enriquecimento cnpj: {str(e)}")
