const COLOR_MAP = {
    0: "#000000",    1: "#FF0000",    2: "#FFA500",    3: "#FFFF00",
    4: "#00FF00",    5: "#0000FF",    6: "#4B0082",    7: "#800080",
    8: "#808080",    9: "#FFFFFF"
};

let generatedImages = []; // {url, summary}

function getTextColorForBackground(hexColor) {
    let r = parseInt(hexColor.slice(1,3),16), g = parseInt(hexColor.slice(3,5),16), b = parseInt(hexColor.slice(5,7),16);
    return ((0.2126*r+0.7152*g+0.0722*b)/255)>0.5 ? "black":"white";
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page=>{
        page.classList.toggle('active', page.id === pageId);
        page.classList.toggle('hidden', page.id !== pageId);
    });
}

// GCD, 순환 마디
function gcd(a,b){ return b===0?a:gcd(b,a%b);}
function getRecurringDigits(n,d){
    if(d===0) return {digits:[],error:"분모는 0이 될 수 없어요!"};
    if(n===0) return {digits:[0],error:"분자가 0이면 그냥 0이 돼요."};
    n = Math.abs(n); d = Math.abs(d);
    let cd=gcd(n,d); n/=cd; d/=cd;
    let m={},digits=[],cur=n%d,idx=0;
    if(cur===0) return {digits:[0],error:`${n}/${d}는 순환 마디가 없는 유한 소수예요.`};
    while(true){
        cur*=10;
        if(m[cur]!==undefined) return {digits:digits.slice(m[cur]),error:""};
        m[cur]=idx;
        digits.push(Math.floor(cur/d));
        cur%=d;
        if(cur===0) return {digits:[0],error:`${n}/${d}는 유한 소수입니다.`};
        if(idx++>1000) return {digits:[],error:"순환 마디가 너무 깁니다."};
    }
}

function drawPattern(digits) {
    const canvas = document.getElementById('mathArtCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const boxSize=20, cols=Math.floor(canvas.width/boxSize), rows=Math.floor(canvas.height/boxSize);
    let idx=0;
    if(!digits.length)return;
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            ctx.fillStyle = COLOR_MAP[digits[idx]]||"#000000";
            ctx.fillRect(c*boxSize, r*boxSize, boxSize, boxSize);
            idx = (idx+1)%digits.length;
        }
    }
}

function addImageThumb(url, summary){
    const selDiv = document.getElementById('imageSelection');
    const idx = generatedImages.length+1;
    const label = document.createElement('label');
    label.innerHTML = `
        <input type="checkbox" value="${url}">
        <img src="${url}" class="image-thumb" alt="미리보기${idx}">
        <span>${summary||"이미지"+idx}</span>
    `;
    selDiv.appendChild(label);
}

function handleResult(numer, denom){
    const {digits, error} = getRecurringDigits(numer, denom);
    const info = document.getElementById('resultDisplayInfo');
    if(error){
        info.innerHTML = `<span style="color: #721c24;">${error}</span>`;
        document.getElementById('mathArtCanvas').getContext('2d').clearRect(0,0,720,480);
        return;
    }
    const decVal = (numer/denom).toFixed(10);
    let html = `선택한 분수: <strong>${numer}/${denom}</strong> (<strong>${decVal}</strong>)<br>순환 마디: `;
    digits.forEach(dg=>{
        html += `<span style="background:${COLOR_MAP[dg]};color:${getTextColorForBackground(COLOR_MAP[dg])};padding:3px 6px;border-radius:4px;margin:0 1px;font-weight:bold;">${dg}</span>`;
    });
    info.innerHTML = html;
    drawPattern(digits);
    // 썸네일, 체크박스 등록 (canvas->이미지화)
    const url = document.getElementById('mathArtCanvas').toDataURL('image/png');
    generatedImages.push({url, summary:`${numer}/${denom}`}); // 상태 push
    addImageThumb(url, `${numer}/${denom}`);
}

function resetThumbs() {
    generatedImages = [];
    document.getElementById('imageSelection').innerHTML = "";
}

// 병합 다운로드 (PNG)
function mergeAndDownload(images) {
    // 모든 이미지가 같은 크기라고 가정(180x120)
    const imgWidth=180, imgHeight=120, totalWidth=imgWidth*images.length;
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth; canvas.height = imgHeight;
    const ctx = canvas.getContext('2d');
    let loaded=0, imgArr=[];
    images.forEach((url,i)=>{
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, i*imgWidth, 0, imgWidth, imgHeight);
            loaded++;
            if(loaded === images.length){
                // 모두 그려졌으면 다운로드
                canvas.toBlob(blob=>{
                    const a=document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = "merged_math_art.png";
                    document.body.appendChild(a); a.click(); a.remove();
                },'image/png');
            }
        }
        img.src = url;
        imgArr.push(img);
    });
}

// ------------ 이벤트 바인딩 & 프로그램 흐름 ------------
window.addEventListener("DOMContentLoaded", function(){
    // 페이지 전환
    document.getElementById('toTestPageBtn').onclick
        = ()=>{ showPage('testPage'); resetThumbs(); document.getElementById('resultDisplayInfo').innerHTML=""; }
    document.getElementById('toTestPageBtn2').onclick
        = ()=>{ showPage('testPage'); }
    document.getElementById('toExplanationPageBtn').onclick
        = ()=>{ showPage('explanationPage'); }

    // 결과보기
    document.getElementById('generateBtn').onclick = function() {
        const n = parseInt(document.getElementById('numerator').value),
              d = parseInt(document.getElementById('denominator').value),
              msg = document.getElementById('testPageMessage');
        if(isNaN(n)||isNaN(d)||n<=0||d<=0){
            msg.textContent = "분자와 분모는 1 이상의 자연수여야 해요!";
            return;
        } msg.textContent = "";
        showPage('resultPage');
        handleResult(n, d);
    };

    // 다운로드 버튼
    document.getElementById('downloadSelectedBtn').onclick = function(){
        const checked = Array.from(document.querySelectorAll('#imageSelection input:checked'));
        if(checked.length===0) {
            alert("다운로드할 이미지를 선택하세요!");
            return;
        }
        if(checked.length===1) {
            // 한 개만 선택: 바로 다운로드
            const url = checked[0].value;
            const a = document.createElement('a');
            a.href = url;
            a.download = "math_art_image.png";
            document.body.appendChild(a); a.click(); a.remove();
        } else {
            // 여러 개 선택: 병합
            const urls = checked.map(e=>e.value);
            mergeAndDownload(urls);
        }
    };
});
