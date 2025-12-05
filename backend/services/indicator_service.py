from fastapi import HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from models.indicator_config import IndicatorConfig
from schemas.indicator_schemas import IndicatorConfigCreate, IndicatorConfigUpdate


class IndicatorService:

    def list_indicators(self, db: Session):
        return db.query(IndicatorConfig).order_by(IndicatorConfig.id).all()

    def create_indicator(self, db: Session, payload: IndicatorConfigCreate):
        ind = IndicatorConfig(**payload.model_dump())
        db.add(ind)
        db.commit()
        db.refresh(ind)
        return ind

    def update_indicator(self, db: Session, id: int, payload: IndicatorConfigUpdate):
        ind = db.query(IndicatorConfig).filter(IndicatorConfig.id == id).first()
        if not ind:
            raise HTTPException(404, "Indicator not found")

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(ind, field, value)

        db.commit()
        db.refresh(ind)
        return ind

    def delete_indicator(self, db: Session, id: int):
        ind = db.query(IndicatorConfig).filter(IndicatorConfig.id == id).first()
        if not ind:
            raise HTTPException(404, "Indicator not found")
        db.delete(ind)
        db.commit()

    def indicator_template(self):
        csv = (
            "indicator_name,description,active,parameter_1,parameter_2,parameter_3,manual_weight,use_ai_weight,ai_latest_weight\n"
            "RSI,Relative Strength Index,Y,14,,,1.0,N,\n"
        )
        return Response(
            content=csv,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="indicator_template.csv"'},
        )

    async def upload_indicators(self, db: Session, file: UploadFile):
        # full parsing code (your logic)
        ...


indicator_service = IndicatorService()
