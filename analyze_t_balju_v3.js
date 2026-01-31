// analyze_t_balju_v3.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function analyze() {
    try {
        const today = new Date();
        const pastDate = new Date(today.setMonth(today.getMonth() - 3));
        const yyyy = pastDate.getFullYear();
        const mm = String(pastDate.getMonth() + 1).padStart(2, '0');
        const dd = String(pastDate.getDate()).padStart(2, '0');
        const targetDateStr = `${yyyy}-${mm}-${dd}`;

        console.log(`[분석 시작] 기준: ${targetDateStr} 이후 (SQL 최적화 모드)`);

        // 1. 컬럼 목록 가져오기
        const sample = await prisma.t_balju.findFirst();
        if (!sample) {
            console.log("데이터 없음");
            return;
        }
        const columns = Object.keys(sample);

        const unusedColumns = [];
        let checked = 0;

        console.log(`총 ${columns.length}개 컬럼 검사 시작...`);

        // 2. 각 컬럼별로 유효 데이터 존재 여부 확인 (병렬 처리 제한적으로 수행)
        for (const col of columns) {
            // 주의: SQL Injection 방지를 위해 컬럼명은 직접 검증하거나 prisma.raw 사용 시 주의 필요.
            // 여기서는 내부 로직이므로 col 값을 그대로 사용하되, 백틱으로 감쌈.

            try {
                const query = `
                    SELECT 1 
                    FROM t_balju 
                    WHERE B_DATE >= '${targetDateStr}' 
                      AND \`${col}\` IS NOT NULL 
                      AND \`${col}\` != '' 
                    LIMIT 1
                `;

                const result = await prisma.$queryRawUnsafe(query);

                if (result.length === 0) {
                    unusedColumns.push(col);
                }
            } catch (e) {
                console.error(`컬럼 ${col} 검사 중 에러:`, e.message);
            }

            checked++;
            if (checked % 10 === 0) process.stdout.write('.');
        }
        console.log("\n");

        // 3. 리포트 출력 및 파일 저장
        let report = `
# t_balju 미사용 컬럼 분석 리포트

- **분석 일시**: ${new Date().toLocaleString()}
- **분석 대상**: 최근 3개월 데이터 (기준일: ${targetDateStr})
- **총 컬럼 수**: ${columns.length}개
- **미사용 컬럼 수**: ${unusedColumns.length}개

## 미사용 컬럼 목록 (Usage: 0)
`;
        console.log("\n[리포트] 최근 3개월간 사용되지 않은 컬럼 목록 (Usage: 0):");
        console.log("==================================================");

        if (unusedColumns.length === 0) {
            report += "\n- (없음) 모든 컬럼이 사용 중입니다.\n";
            console.log("없음");
        } else {
            unusedColumns.forEach(col => {
                report += `- \`${col}\`\n`;
                console.log(`- ${col}`);
            });
        }

        console.log("==================================================");
        console.log(`총 ${columns.length}개 중 ${unusedColumns.length}개 미사용 (기준일: ${targetDateStr})`);

        fs.writeFileSync('t_balju_unused_report.md', report, 'utf8');
        console.log("리포트 파일 생성 완료: t_balju_unused_report.md");

    } catch (e) {
        console.error("에러:", e);
    } finally {
        await prisma.$disconnect();
    }
}

analyze();
