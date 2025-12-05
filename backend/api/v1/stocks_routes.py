from fastapi import APIRouter, Query
from typing import List

from services import stock_service

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/", response_model=List[str])
def list_symbols():
    return stock_service.get_all_symbols()


@router.get("/{symbol}/history")
def stock_history(symbol: str, limit: int = Query(100, ge=1, le=1000)):
    return stock_service.get_symbol_history(symbol, limit)
