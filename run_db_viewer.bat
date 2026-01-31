@echo off
title SME DB Viewer Server
set PROJECT_DIR=f:\AG\my-db-viewer
cd /d %PROJECT_DIR%

echo ==================================================
echo   🚀 SME DB Viewer를 시작합니다...
echo   👉 접속 주소: http://localhost:3010
echo ==================================================
echo.

node web_db_viewer.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ 서버 실행 중 오류가 발생했습니다.
    pause
)
