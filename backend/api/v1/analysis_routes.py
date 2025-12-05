from fastapi import APIRouter, Query
from services import top_picks_service

router = APIRouter()

@router.get("/top-picks")
def top_picks(limit: int = Query(10, ge=1, le=100)):
    return top_picks_service.get_top_picks(limit)
