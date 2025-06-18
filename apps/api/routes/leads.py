from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from packages.database.session import get_session
from apps.api.schemas.lead import LeadList, LeadBase, LeadDetail
from apps.api.services import lead_service

router = APIRouter(prefix="/leads", tags=["leads"])

@router.get("", response_model=LeadList)
async def list_leads(
    segment: str | None = Query(None, description="home, cni, gtd"),
    classe: str | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    total, items = await lead_service.list_leads(db, segment, classe, skip, limit)
    return {"total": total, "items": items}

@router.get("/{lead_id}", response_model=LeadDetail)
async def lead_detail(
    lead_id: str,
    db: AsyncSession = Depends(get_session),
):
    lead = await lead_service.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.get("/heatmap", response_model=list[tuple[float, float, int]])
async def heatmap(
    segment: str | None = Query(None),
    db: AsyncSession = Depends(get_session),
):
    """
    Retorna tuplas (lat, lon, count) usadas diretamente pelo front
    para colocar círculos no mapa.
    """
    return await lead_service.heatmap_points(db, segment)
