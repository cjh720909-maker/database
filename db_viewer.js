// -----------------------------------------------------------
// [SME 개발 사수] 주니어 멘토링용 DB 뷰어 프로그램
// -----------------------------------------------------------

// 1. .env 파일 로딩 (에러 방지용 필수 코드 추가)
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

// Prisma 클라이언트 실행 (로그 옵션을 켜서 실제 쿼리가 어떻게 나가는지 볼 수 있게 함)
const prisma = new PrismaClient({
  log: ['error', 'warn'], // 에러나 경고가 있으면 보여줌
});

// 키보드 입력을 받기 위한 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 테이블별 날짜 컬럼 매핑 (스키마 분석 기반)
const TABLE_DATE_COLUMNS = {
  // 1. 발주/주문 관련
  't_balju': 'B_DATE',
  't_balju_pre': 'B_DATE',
  't_order': 'O_DATE',
  
  // 2. 입출고 관련
  't_in': 'I_DATE',
  't_out': 'O_DATE',
  't_out_box': 'O_DATE',
  
  // 3. 재고/실사
  't_stock_das': 'SD_DATE',
  't_manage_stock': 'MS_DATE',
  
  // 4. 배송/차량
  't_il_car': 'IC_DATE',
  't_car_in': 'CI_DATE',
  
  // 5. 메시지 로그 (DateTime 타입 주의)
  'mms_msg': 'REQDATE',
  'sc_tran': 'TR_SENDDATE',
};

// 메인 실행 함수
const main = async () => {
  console.clear();
  console.log("=================================================");
  console.log("   🚀 내 DB 진짜 데이터 조회기 (ChromeOS Flex Ver)");
  console.log("=================================================");
  console.log(" * 종료하려면 언제든 Ctrl + C를 누르세요.");
  console.log("");

  // 1. 테이블 이름 입력 받기
  rl.question('👉 보고 싶은 테이블 이름을 입력하세요 (예: t_balju, mms_msg): ', async (tableName) => {
    
    // 테이블 이름 공백 제거
    tableName = tableName.trim();

    if (!prisma[tableName]) {
        console.log(`\n❌ 에러: '${tableName}'라는 테이블을 찾을 수 없습니다.`);
        console.log("   schema.prisma 파일에 정의된 모델 이름인지 확인해주세요.");
        process.exit(1);
    }

    console.log(`\n   [${tableName}] 테이블을 선택하셨습니다.`);

    // 2. 날짜 입력 받기
    rl.question('👉 조회할 날짜를 입력하세요 (예: 2026-01-24, 엔터치면 최신순 10개): ', async (dateInput) => {
        
        try {
            const dateCol = TABLE_DATE_COLUMNS[tableName];
            let whereClause = {};

            // 날짜 입력이 있는 경우
            if (dateInput.trim() !== '') {
                if (dateCol) {
                    // 메시지 테이블처럼 실제 날짜시간(DateTime) 타입인 경우 범위 검색 필요
                    if (['mms_msg', 'sc_tran'].includes(tableName) || tableName.startsWith('mms_log') || tableName.startsWith('sc_log')) {
                        const startDate = new Date(dateInput);
                        const endDate = new Date(dateInput);
                        endDate.setDate(endDate.getDate() + 1); // 다음날 0시 0분

                        // 해당 날짜 00:00 ~ 다음날 00:00 사이 조회
                        whereClause = {
                            [dateCol]: {
                                gte: startDate,
                                lt: endDate
                            }
                        };
                    } else {
                        // 일반 문자열 날짜 (예: "2026-01-24")
                        whereClause = {
                            [dateCol]: dateInput.trim()
                        };
                    }
                    console.log(`   🔎 조건: ${dateCol} = ${dateInput} 검색 중...`);
                } else {
                    console.log(`   ⚠️ 알림: '${tableName}' 테이블은 날짜 컬럼 정보가 등록되지 않아 최근 데이터 10개만 조회합니다.`);
                }
            } else {
                console.log("   🔎 날짜 입력이 없어 최근 데이터 10개를 조회합니다.");
            }

            // 쿼리 실행
            const data = await prisma[tableName].findMany({
                where: whereClause,
                take: 10, 
            });

            console.log("\n================ [ 조회 결과 ] ================");
            
            if (data.length === 0) {
                console.log("   📭 데이터가 없습니다.");
            } else {
                console.log(`\n📊 총 ${data.length}건이 조회되었습니다.\n`);
                console.log("--- [첫 번째 데이터 상세] ---");
                console.log(data[0]); 
                console.log("-----------------------------\n");
                console.table(data);
            }

        } catch (error) {
            console.error("\n❌ 데이터 조회 중 에러가 발생했습니다.");
            console.error("   에러 내용:", error.message);
        } finally {
            await prisma.$disconnect();
            rl.close();
        }
    });
  });
};

main();