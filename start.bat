@echo off
chcp 65001 > nul
title 휠체어 CS 센터 서버 실행 (v1.2)
echo.
echo ========================================
echo   CS 챗봇 및 관리자 대시보드 (v1.2)
echo ========================================
echo.
echo 대장님, 로컬 환경에서 서버를 구동 중입니다...
echo 로컬 스토리지를 통한 원활한 상태 관리를 위해 웹 서버 환경으로 엽니다.
echo.

:: Python 확인
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python 환경이 확인되었습니다.
    start /b python -m http.server 8080
    timeout /t 2 /nobreak > nul
    start http://localhost:8080/index.html
    start http://localhost:8080/admin.html
    echo 두 개의 브라우저 창을 모두 열었습니다! 이 창을 닫으면 서버가 종료됩니다.
    pause
    taskkill /pid %! /f
    exit
)

:: Node/npx 확인
npx --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js(npx) 환경이 확인되었습니다.
    start /b npx serve -l 8080
    timeout /t 2 /nobreak > nul
    start http://localhost:8080/index.html
    start http://localhost:8080/admin.html
    echo 두 개의 브라우저 창을 모두 열었습니다! 이 창을 닫으면 서버가 종료됩니다.
    pause
    exit
)

:: 둘 다 없을 경우 그냥 파일 열기
echo [알림] Python이나 Node.js가 발견되지 않아 파일 모드로 직접 실행합니다.
start index.html
start admin.html
exit
