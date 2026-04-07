const cp = require('child_process');
const fs = require('fs');

console.log('Fetching data...');
let raw = cp.execSync('firebase database:get /settings/responses', { encoding: 'utf8' });
let jsonStart = raw.indexOf('{');
let jsonStr = raw.substring(jsonStart);
let data = JSON.parse(jsonStr);

let modifiedCount = 0;

for (let key in data) {
    if (data[key] && data[key].text) {
        if (data[key].text.includes("📋 [문의 접수 양식]") && !data[key].text.includes("신속한 상담을 위해")) {
            data[key].text = data[key].text.replace(
                "📋 [문의 접수 양식]\n\n1.", 
                "📋 [문의 접수 양식]\n신속한 상담을 위해 아래 정보를 작성해 주시면 감사하겠습니다.\n\n1."
            );
            modifiedCount++;
            console.log(`Updated ${key}`);
        }
        else if (data[key].text.includes("📋 [대량구매 문의 양식]") && !data[key].text.includes("신속한 상담을 위해")) {
            data[key].text = data[key].text.replace(
                "📋 [대량구매 문의 양식]\n\n1.", 
                "📋 [대량구매 문의 양식]\n신속한 상담을 위해 아래 정보를 작성해 주시면 감사하겠습니다.\n\n1."
            );
            modifiedCount++;
            console.log(`Updated ${key}`);
        }
    }
}

if (modifiedCount > 0) {
    fs.writeFileSync('fixed_responses2.json', JSON.stringify(data, null, 2), 'utf8');
    console.log(`Writing back to database... (${modifiedCount} items modified)`);
    cp.execSync('firebase database:set /settings/responses fixed_responses2.json --force', { stdio: 'inherit' });
    console.log('Done!');
} else {
    console.log('No modifications needed.');
}
