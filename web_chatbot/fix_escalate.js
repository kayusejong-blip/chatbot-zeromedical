const cp = require('child_process');
const fs = require('fs');

console.log('Fetching data...');
let raw = cp.execSync('firebase database:get /settings/responses', { encoding: 'utf8' });
let jsonStart = raw.indexOf('{');
let jsonStr = raw.substring(jsonStart);
let data = JSON.parse(jsonStr);

const oldPattern = /전문 상담원과 즉시 연결해 드리겠습니다\.\n(?:n|\\n)*담당자가 배정되는 동안, 원활하고 신속한 처리를 위해 \*\*하단 채팅창에 아래 항목을 미리 남겨주시면\*\* 대단히 감사하겠습니다\.\n(?:n|\\n)*─────────────────────\n📋 \**\[문의 접수 양식\]\**\n- 구매하신 채널 \(예: 쿠팡, 스마트스토어 등\):\n- 구매자 성함:\n- 구매하신 상품명:\n- 겪고 계신 문제나 증상:\n─────────────────────/g;

/** A simpler pattern since we know exactly what we want to replace */
const newText = "📋 [문의 접수 양식]\n\n1. 구매하신 채널 : (예: 쿠팡, 스마트스토어 등)\n2. 구매자 성함 :\n3. 구매하신 상품명 :\n4. 겪고 계신 문제나 증상 :";

let modifiedCount = 0;

for (let key in data) {
    if (data[key] && data[key].text) {
        if (data[key].text.includes("전문 상담원과 즉시 연결해 드리겠습니다") && data[key].text.includes("문의 접수 양식")) {
            console.log(`Updating key: ${key}`);
            data[key].text = newText;
            modifiedCount++;
        }
    }
}

if (modifiedCount > 0) {
    fs.writeFileSync('fixed_responses.json', JSON.stringify(data, null, 2), 'utf8');
    console.log(`Writing back to database... (${modifiedCount} items modified)`);
    cp.execSync('firebase database:set /settings/responses fixed_responses.json -y', { stdio: 'inherit' });
    console.log('Done!');
} else {
    console.log('No matches found.');
}
