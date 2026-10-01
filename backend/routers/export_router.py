from typing import List
from fastapi import APIRouter, HTTPException, Response
from backend.schemas import GroupSchema
from backend.services.export_service import export_groups_to_excel, export_groups_to_csv

router = APIRouter(prefix="/export", tags=["Export & Reporting"])


@router.post("/excel")
async def export_excel_endpoint(groups: List[GroupSchema]):
    """Xuất danh sách phân nhóm ra file Excel (.xlsx) với Sheet Tổng quan và các Sheet Nhóm chi tiết."""
    if not groups:
        raise HTTPException(status_code=400, detail="Không có nhóm nào để xuất.")

    try:
        excel_bytes = export_groups_to_excel(groups)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=NOVIARA_Results.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất file Excel: {str(e)}")


@router.post("/csv")
async def export_csv_endpoint(groups: List[GroupSchema]):
    """Xuất danh sách phân nhóm ra file CSV phẳng (UTF-8 BOM)."""
    if not groups:
        raise HTTPException(status_code=400, detail="Không có nhóm nào để xuất.")

    try:
        csv_bytes = export_groups_to_csv(groups)
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=NOVIARA_Results.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất file CSV: {str(e)}")
