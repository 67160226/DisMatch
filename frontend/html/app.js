// ==================== 1. ตั้งค่า API Endpoint ====================
const API_BASE_URL = 'https://dismatch.onrender.com';

// ==================== 2. ระบบคลังรูปภาพอาหาร ====================
const foodImageMap = {
    'ข้าวมันไก่': 'images/foods/ข้าวมันไก่.jpg',
    'ข้าวมันไก่ทอด': 'images/foods/ข้าวมันไก่ทอด.jpg',
    'ข้าวหมูกรอบ': 'images/foods/ข้าวหมูกรอบ.jpg',
    'ข้าวหมูแดง': 'images/foods/ข้าวหมูแดง.jpg',
    'ข้าวขาหมู': 'images/foods/ข้าวขาหมู.jpg',
    'ข้าวผัดกะเพราหมูสับ': 'images/foods/ข้าวผัดกะเพราหมูสับ.jpg',
    'ผัดกะเพราเนื้อ': 'images/foods/ผัดกะเพราเนื้อ.jpg',
    'ข้าวผัดปู': 'images/foods/ข้าวผัดปู.jpg',
    'ข้าวผัดไข่': 'images/foods/ข้าวผัดไข่.jpg',
    'ข้าวคลุกกะปิ': 'images/foods/ข้าวคลุกกะปิ.jpg',
    'ต้มยำกุ้ง': 'images/foods/ต้มยำกุ้ง.jpg',
    'แกงเขียวหวานไก่': 'images/foods/แกงเขียวหวานไก่.jpg',
    'ส้มตำไทย': 'images/foods/ส้มตำไทย.jpg',
    'ส้มตำปูปลาร้า': 'images/foods/ส้มตำปูปลาร้า.jpg',
    'ก๋วยเตี๋ยวเรือ': 'images/foods/ก๋วยเตี๋ยวเรือ.jpg',
    'ผัดไทยกุ้งสด': 'images/foods/ผัดไทยกุ้งสด.jpg',
    'ชาบู': 'images/foods/ชาบู.jpg',
    'หมูกระทะ': 'images/foods/หมูกระทะ.jpg',
    'พิซซ่า': 'images/foods/พิซซ่า.jpg',
    'ซูชิ': 'images/foods/ซูชิ.jpg'
};

function getFoodImage(foodName) {
    if (foodImageMap[foodName]) {
        return foodImageMap[foodName];
    }
    // ค้นหาแบบบางส่วนหรือใช้รูปสำรอง
    for (const key of Object.keys(foodImageMap)) {
        if (foodName && (foodName.includes(key) || key.includes(foodName))) {
            return foodImageMap[key];
        }
    }
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop';
}

// ==================== 3. ระบบยืนยันตัวตน (Auth Module) ====================
const Auth = {
    isLoggedIn: () => localStorage.getItem('currentUser') !== null,
    getCurrentUser: () => localStorage.getItem('currentUser'),
    login: (username) => localStorage.setItem('currentUser', username),
    logout: () => {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
    }
};

// 🍔 คลังเมนูอาหาร
let foods = [
    "ข้าวมันไก่", "ข้าวมันไก่ทอด", "ข้าวหมูกรอบ", "ข้าวหมูแดง", "ข้าวขาหมู",
    "ข้าวผัดกะเพราหมูสับ", "ผัดกะเพราเนื้อ", "ข้าวผัดปู", "ข้าวผัดไข่", "ข้าวคลุกกะปิ",
    "ต้มยำกุ้ง", "แกงเขียวหวานไก่", "ส้มตำไทย", "ส้มตำปูปลาร้า", "ก๋วยเตี๋ยวเรือ",
    "ผัดไทยกุ้งสด", "ชาบู", "หมูกระทะ", "พิซซ่า", "ซูชิ"
];

let currentRoomFoods = [];
let currentFoodIndex = 0;
let currentRoomCode = '';
let pollInterval = null;
let swipedCount = 0;

// ==================== 4. Router & Event Listeners ====================
document.addEventListener('DOMContentLoaded', () => {
    const isDashboard = document.getElementById('page-dashboard') || document.getElementById('user-display');
    const isRoom = document.getElementById('room-code-display') || document.getElementById('swipe-section');

    document.querySelectorAll('.toggle-pw').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                targetInput.type = targetInput.type === 'password' ? 'text' : 'password';
            }
        });
    });

    if (isDashboard) {
        if (!Auth.isLoggedIn()) return window.location.href = 'login.html';
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.textContent = Auth.getCurrentUser();
        renderFoodList();

        const newFoodInput = document.getElementById('new-food-input');
        if (newFoodInput) {
            newFoodInput.addEventListener('keypress', e => {
                if (e.key === 'Enter') handleAddFood();
            });
        }
    }

    if (isRoom) {
        if (!Auth.isLoggedIn()) return window.location.href = 'login.html';

        const urlParams = new URLSearchParams(window.location.search);
        currentRoomCode = urlParams.get('code');
        const username = Auth.getCurrentUser();

        if (!currentRoomCode) {
            alert('ไม่พบรหัสห้อง');
            return window.location.href = 'dashboard.html';
        }

        const roomCodeDisplay = document.getElementById('room-code-display');
        if (roomCodeDisplay) roomCodeDisplay.textContent = currentRoomCode;

        fetch(`${API_BASE_URL}/rooms/${currentRoomCode}/join?username=${encodeURIComponent(username)}`, { method: 'POST' })
            .then(() => {
                loadRoomData();
                startMatchPolling();
            })
            .catch(e => console.error('Error joining room:', e));
    }
});

function loadRoomData() {
    fetch(`${API_BASE_URL}/rooms/${currentRoomCode}`)
        .then(res => res.json())
        .then(data => {
            currentRoomFoods = data.foods;

            const memberListEl = document.getElementById('member-list') || document.getElementById('room-members');
            if (memberListEl && data.members) {
                memberListEl.innerHTML = data.members.map(m => `<span class="badge" style="background:var(--primary, #e50914); color:#fff; padding:4px 10px; border-radius:12px; margin-right:4px;">👤 ${m}</span>`).join(' ');
            }

            if (currentFoodIndex === 0) {
                showNextFood();
            }
        });
}

// ==================== 5. ระบบสุ่มเมนูอาหาร (CS:GO Roulette & Random Spin) ====================
let isSpinning = false;

function pickFood() {
    const track = document.getElementById('csgo-track');
    const resultText = document.getElementById('result-text');
    const spinBtn = document.getElementById('spin-btn');
    const wrapper = track ? track.closest('.csgo-wrapper') : null;

    // ถ้าไม่มี track ของ CS:GO ให้ fallback ไปใช้ popup random ปกติ
    if (!track || !wrapper) {
        return handleRandomFood();
    }

    if (isSpinning) return;
    if (!foods || foods.length === 0) return alert('ไม่มีรายการอาหารในระบบ');

    isSpinning = true;
    if (spinBtn) {
        spinBtn.disabled = true;
        spinBtn.style.opacity = '0.6';
        spinBtn.textContent = '⏳ กำลังสุ่มเมนู...';
    }
    if (resultText) {
        resultText.textContent = 'กำลังสุ่มเมนูอาหาร... 🎲';
    }

    const totalItems = 45;
    const winnerIndex = 36;
    const winnerFood = foods[Math.floor(Math.random() * foods.length)];

    let itemsHtml = '';
    for (let i = 0; i < totalItems; i++) {
        const foodName = (i === winnerIndex) ? winnerFood : foods[Math.floor(Math.random() * foods.length)];
        const rarity = Math.floor(Math.random() * 5);
        itemsHtml += `<div class="csgo-item rarity-${rarity}" data-index="${i}" style="background-image: url('${getFoodImage(foodName)}');">
            <div class="csgo-item-title">${foodName}</div>
        </div>`;
    }

    track.style.transition = 'none';
    track.style.transform = 'translateX(0px)';
    track.innerHTML = itemsHtml;

    // บังคับ Reflow เพื่อให้ transition ทำงานใหม่ทุกครั้ง
    void track.offsetHeight;

    const itemWidth = 120; // 110px width + 10px margin
    const wrapperWidth = wrapper.offsetWidth;
    const targetCenter = (winnerIndex * itemWidth) + (itemWidth / 2);
    // เพิ่ม jitter เล็กน้อยให้เหมือนเกม CS:GO จริงๆ
    const jitter = (Math.random() - 0.5) * 50;
    const finalTranslateX = targetCenter - (wrapperWidth / 2) + jitter;

    track.style.transition = 'transform 4.5s cubic-bezier(0.12, 0.8, 0.2, 1)';
    track.style.transform = `translateX(-${finalTranslateX}px)`;

    setTimeout(() => {
        const winnerCard = track.querySelector(`[data-index="${winnerIndex}"]`);
        if (winnerCard) {
            winnerCard.classList.add('winner');
        }

        if (resultText) {
            const { mapsUrl, linemanUrl, grabUrl } = getNearbyLinks(winnerFood);
            resultText.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 12px; margin-top: 6px;">
                    <div style="font-size: 20px; font-weight: 800; color: #fff;">
                        🎉 วันนี้กิน: <span style="color: var(--primary, #ff1a75);">${winnerFood}</span>! 🍽️
                    </div>
                    
                    <div style="width: 100%; max-width: 260px; height: 160px; border-radius: 16px; background-image: url('${getFoodImage(winnerFood)}'); background-size: cover; background-position: center; border: 2px solid var(--border); box-shadow: 0 8px 25px rgba(0,0,0,0.6); position: relative; overflow: hidden;">
                        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%);"></div>
                        <div style="position: absolute; bottom: 8px; left: 0; right: 0; color: #fff; font-weight: bold; font-size: 15px; text-shadow: 0 2px 5px rgba(0,0,0,0.9); text-align: center;">${winnerFood}</div>
                    </div>

                    <div style="width: 100%; margin-top: 4px;">
                        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" 
                            style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 12px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); margin-bottom: 8px;">
                            🗺️ ร้านใกล้เคียง ม.บูรพา บางแสน บน Google Maps
                        </a>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <a href="${linemanUrl}" target="_blank" rel="noopener noreferrer"
                                style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #00b900; color: #ffffff; text-decoration: none; padding: 9px 10px; border-radius: 10px; font-weight: 700; font-size: 12px; box-shadow: 0 3px 10px rgba(0, 185, 0, 0.3);">
                                🟢 LINE MAN
                            </a>
                            <a href="${grabUrl}" target="_blank" rel="noopener noreferrer"
                                style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #00b14f; color: #ffffff; text-decoration: none; padding: 9px 10px; border-radius: 10px; font-weight: 700; font-size: 12px; box-shadow: 0 3px 10px rgba(0, 177, 79, 0.3);">
                                🚗 GrabFood
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }

        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.style.opacity = '1';
            spinBtn.textContent = '🔥 เปิดกล่องสุ่มอีกรอบ!';
        }

        isSpinning = false;
    }, 4600);
}

function handleRandomFood() {
    const foodSource = (currentRoomFoods && currentRoomFoods.length > 0) ? currentRoomFoods : foods;
    if (!foodSource || foodSource.length === 0) return alert('ไม่มีรายการอาหารให้สุ่มครับ');

    const selectedFood = foodSource[Math.floor(Math.random() * foodSource.length)];

    let spinOverlay = document.getElementById('spin-overlay');
    if (!spinOverlay) {
        spinOverlay = document.createElement('div');
        spinOverlay.id = 'spin-overlay';
        spinOverlay.className = 'instant-match-screen';
        document.body.appendChild(spinOverlay);
    }

    spinOverlay.innerHTML = `
        <div class="match-content" style="text-align: center; max-height: 90vh; overflow-y: auto;">
            <div class="badge-match" style="background: #8b5cf6; color: #fff;">🎲 สุ่มเมนูอาหาร</div>
            <h1 class="match-heading" style="margin-top: 10px;">วันนี้กิน... 🎉</h1>
            
            <div class="match-image-box" style="background-image: url('${getFoodImage(selectedFood)}'); margin: 16px auto; height: 180px;">
                <div class="match-food-title">${selectedFood}</div>
            </div>

            ${renderMatchActionButtons(selectedFood)}

            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
                <button class="btn btn-primary" onclick="handleRandomFood()" style="flex: 1; padding: 10px 14px; font-weight: bold; border-radius: 12px;">สุ่มใหม่ 🔄</button>
                <button class="btn btn-secondary" onclick="document.getElementById('spin-overlay').remove()" style="flex: 1; padding: 10px 14px; font-weight: bold; border-radius: 12px;">ปิดหน้าต่าง ✕</button>
            </div>
        </div>
    `;
}

// ผูก Alias ฟังก์ชันสุ่มให้เรียกได้ทุกชื่อ ทั้งในหน้า dashboard และ room
window.pickFood = pickFood;
window.startSpin = pickFood;
window.spinFood = pickFood;
window.randomSelect = pickFood;
window.handleRandomFood = handleRandomFood;

// ==================== 6. ระบบปัดการ์ด (Swipe System) ====================
function bindSwipeEvents(cardElement) {
    if (!cardElement) return;

    let startX = 0, currentX = 0, isDragging = false;

    cardElement.onpointerdown = (e) => {
        isDragging = true;
        startX = e.clientX;
        cardElement.style.transition = 'none';
    };

    cardElement.onpointermove = (e) => {
        if (!isDragging) return;
        currentX = e.clientX;
        const deltaX = currentX - startX;
        cardElement.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.08}deg)`;
    };

    const handleUp = () => {
        if (!isDragging) return;
        isDragging = false;
        const deltaX = currentX - startX;
        cardElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

        if (deltaX > 100) {
            cardElement.classList.add('swipe-right');
            setTimeout(() => {
                cardElement.classList.remove('swipe-right');
                handleSwipe(true);
            }, 300);
        } else if (deltaX < -100) {
            cardElement.classList.add('swipe-left');
            setTimeout(() => {
                cardElement.classList.remove('swipe-left');
                handleSwipe(false);
            }, 300);
        } else {
            cardElement.style.transform = 'translateX(0px) rotate(0deg)';
        }
        startX = 0; currentX = 0;
    };

    cardElement.onpointerup = handleUp;
    cardElement.onpointercancel = handleUp;
}

function showNextFood() {
    if (currentFoodIndex < currentRoomFoods.length) {
        const foodName = currentRoomFoods[currentFoodIndex];
        const foodTitle = document.getElementById('food-title');
        const foodCard = document.querySelector('.food-card');

        if (foodTitle) foodTitle.textContent = foodName;
        if (foodCard) {
            foodCard.style.backgroundImage = `url('${getFoodImage(foodName)}')`;
            foodCard.classList.add('has-image');
            foodCard.style.transform = 'translateX(0px) rotate(0deg)';
            bindSwipeEvents(foodCard);
        }
    } else {
        showNoMatchScreen();
    }
}

async function handleSwipe(isLike) {
    if (currentFoodIndex >= currentRoomFoods.length) return;

    const foodName = currentRoomFoods[currentFoodIndex];
    const username = Auth.getCurrentUser();

    swipedCount++;
    if (swipedCount >= 20) {
        showTopVoteShortcut();
    }

    try {
        const res = await fetch(`${API_BASE_URL}/rooms/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_code: currentRoomCode,
                food_name: foodName,
                username: username,
                is_like: isLike
            })
        });

        const data = await res.json();

        if (data.is_match) {
            removeTopVoteShortcut();
            triggerMatch(data.matched_food || foodName);
            return;
        }
    } catch (e) {
        console.error('Error voting:', e);
    }

    currentFoodIndex++;
    showNextFood();
}

function startMatchPolling() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        try {
            loadRoomData();
            const res = await fetch(`${API_BASE_URL}/rooms/${currentRoomCode}/status`);
            const data = await res.json();

            if (data.is_match) {
                clearInterval(pollInterval);
                removeTopVoteShortcut();
                triggerMatch(data.matched_food);
            }
        } catch (e) {
            console.error('Polling error:', e);
        }
    }, 2000);
}

function getNearbyLinks(foodName) {
    const query = encodeURIComponent(`${foodName} มหาวิทยาลัยบูรพา บางแสน`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    const linemanUrl = `https://lineman.line.me/search?q=${encodeURIComponent(foodName)}`;
    const grabUrl = `https://food.grab.com/th/th/restaurants?search=${encodeURIComponent(foodName)}`;
    return { mapsUrl, linemanUrl, grabUrl };
}

function renderMatchActionButtons(foodName) {
    const { mapsUrl, linemanUrl, grabUrl } = getNearbyLinks(foodName);
    return `
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; text-align: left;">
            <div style="font-size: 13px; font-weight: 700; color: #ff9f1a; display: flex; align-items: center; gap: 6px;">
                📍 พิกัดร้านใกล้ ม.บูรพา บางแสน:
            </div>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" 
                style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 16px; border-radius: 14px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); transition: transform 0.2s;">
                🗺️ ค้นหาร้านใกล้ที่สุดบน Google Maps
            </a>
            
            <div style="font-size: 13px; font-weight: 700; color: #2ed573; margin-top: 6px; display: flex; align-items: center; gap: 6px;">
                🛵 กดสั่ง Delivery ทันที (จัดส่งถึง ม.บูรพา):
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <a href="${linemanUrl}" target="_blank" rel="noopener noreferrer"
                    style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #00b900; color: #ffffff; text-decoration: none; padding: 10px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; box-shadow: 0 3px 10px rgba(0, 185, 0, 0.3);">
                    🟢 LINE MAN
                </a>
                <a href="${grabUrl}" target="_blank" rel="noopener noreferrer"
                    style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #00b14f; color: #ffffff; text-decoration: none; padding: 10px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; box-shadow: 0 3px 10px rgba(0, 177, 79, 0.3);">
                    🚗 GrabFood
                </a>
            </div>
        </div>
    `;
}

function triggerMatch(foodName) {
    if (pollInterval) clearInterval(pollInterval);
    removeTopVoteShortcut();

    const swipeSection = document.getElementById('swipe-section');
    if (swipeSection) swipeSection.style.display = 'none';

    let matchOverlay = document.getElementById('match-overlay');
    if (!matchOverlay) {
        matchOverlay = document.createElement('div');
        matchOverlay.id = 'match-overlay';
        matchOverlay.className = 'instant-match-screen';
        document.body.appendChild(matchOverlay);
    }

    matchOverlay.innerHTML = `
        <div class="match-content" style="max-height: 90vh; overflow-y: auto;">
            <div class="badge-match">MATCHED!</div>
            <h1 class="match-heading">IT'S A MATCH! 🎉</h1>
            <p class="match-sub">ทุกคนในห้องเลือกเมนูนี้เหมือนกันเป๊ะ!</p>
            
            <div class="match-image-box" style="background-image: url('${getFoodImage(foodName)}'); height: 180px;">
                <div class="match-food-title">${foodName}</div>
            </div>

            ${renderMatchActionButtons(foodName)}

            <button class="btn btn-secondary btn-large" style="width: 100%; border-radius: 14px;" onclick="window.location.href='dashboard.html'">
                กลับหน้าหลัก 🏠
            </button>
        </div>
    `;
}

function showNoMatchScreen() {
    if (pollInterval) clearInterval(pollInterval);
    removeTopVoteShortcut();

    const swipeSection = document.getElementById('swipe-section');
    if (swipeSection) {
        swipeSection.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 64px; margin-bottom: 16px;">😅</div>
                <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">ยังไม่เจอเมนูที่ตรงกันเลย</h2>
                <p style="color: var(--text-muted); margin-bottom: 24px;">ทุกคนเลือกไม่เหมือนกันสักเมนู ลองเปิดห้องใหม่อีกรอบนะ!</p>
                <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">กลับหน้าหลัก</button>
            </div>
        `;
    }
}

// ==================== 7. Top Vote Shortcuts ====================
function showTopVoteShortcut() {
    if (document.getElementById('top-vote-shortcut-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'top-vote-shortcut-btn';
    btn.className = 'top-vote-shortcut';
    btn.innerHTML = `📊 สรุป Top Vote เลยมั้ย?`;
    btn.onclick = handleTopVoteClick;
    document.body.appendChild(btn);
}

function removeTopVoteShortcut() {
    const btn = document.getElementById('top-vote-shortcut-btn');
    if (btn) btn.remove();
}

async function handleTopVoteClick() {
    const confirmChoice = confirm('ต้องการสรุปเมนูที่คนเลือกเยอะที่สุด (Top Vote) เลยหรือไม่?');
    if (!confirmChoice) return;

    try {
        const res = await fetch(`${API_BASE_URL}/rooms/${currentRoomCode}/top-vote`);
        const data = await res.json();
        removeTopVoteShortcut();
        triggerTopVoteMatch(data.food_name, data.likes);
    } catch (e) {
        console.error('Error fetching top vote:', e);
    }
}

function triggerTopVoteMatch(foodName, likes) {
    if (pollInterval) clearInterval(pollInterval);
    removeTopVoteShortcut();

    const swipeSection = document.getElementById('swipe-section');
    if (swipeSection) swipeSection.style.display = 'none';

    let matchOverlay = document.getElementById('match-overlay');
    if (!matchOverlay) {
        matchOverlay = document.createElement('div');
        matchOverlay.id = 'match-overlay';
        matchOverlay.className = 'instant-match-screen';
        document.body.appendChild(matchOverlay);
    }

    matchOverlay.innerHTML = `
        <div class="match-content" style="max-height: 90vh; overflow-y: auto;">
            <div class="badge-match" style="background: #fff3e0; color: #ff9f1a;">🏆 TOP VOTED MENU</div>
            <h1 class="match-heading">สรุปเมนูสุดฮิต! 🎉</h1>
            <p class="match-sub">เมนูนี้มียอดคนกดถูกใจมากที่สุด (${likes} เสียง)</p>
            
            <div class="match-image-box" style="background-image: url('${getFoodImage(foodName)}'); height: 180px;">
                <div class="match-food-title">${foodName}</div>
            </div>

            ${renderMatchActionButtons(foodName)}

            <button class="btn btn-secondary btn-large" style="width: 100%; border-radius: 14px;" onclick="window.location.href='dashboard.html'">
                กลับหน้าหลัก 🏠
            </button>
        </div>
    `;
}

// ==================== 8. ระบบ Auth (Login, Register, Google) ====================
async function handleRegister() {
    const username = (document.getElementById('username') || document.getElementById('username-input'))?.value.trim();
    const email = (document.getElementById('email') || document.getElementById('email-input'))?.value.trim();
    const password = (document.getElementById('password') || document.getElementById('password-input'))?.value;
    const confirm = (document.getElementById('confirm') || document.getElementById('confirm-input'))?.value;

    if (!username || !email || !password) {
        return alert('กรุณากรอกข้อมูลให้ครบถ้วนครับ');
    }

    if (confirm && password !== confirm) {
        return alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
    }

    try {
        const res = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert('สมัครสมาชิกสำเร็จ!');
            window.location.href = 'login.html';
        } else {
            alert('สมัครไม่สำเร็จ: ' + (data.detail || 'เกิดข้อผิดพลาด'));
        }
    } catch (e) {
        console.error('Register error:', e);
        alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + e.message);
    }
}

async function handleLogin() {
    const username = (document.getElementById('username') || document.getElementById('username-input'))?.value.trim();
    const password = (document.getElementById('password') || document.getElementById('password-input'))?.value;

    if (!username || !password) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');

    try {
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (res.ok) {
            Auth.login(data.user.username);
            window.location.href = 'dashboard.html';
        } else {
            alert(data.detail || 'เข้าสู่ระบบไม่สำเร็จ');
        }
    } catch (e) {
        console.error('Login error:', e);
        alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend ได้!');
    }
}

async function handleGoogleLogin(response) {
    const idToken = response.credential;
    try {
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken })
        });
        const data = await res.json();
        if (res.ok) {
            Auth.login(data.user.username);
            window.location.href = 'dashboard.html';
        } else {
            alert('Google Login ไม่สำเร็จ: ' + (data.detail || 'เกิดข้อผิดพลาด'));
        }
    } catch (e) {
        alert('เชื่อมต่อ Google Login ไม่สำเร็จ');
    }
}

function handleLogout() {
    Auth.logout();
    window.location.href = 'index.html';
}

async function createNewRoom() {
    const username = Auth.getCurrentUser();
    try {
        const res = await fetch(`${API_BASE_URL}/rooms/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, foods })
        });
        const data = await res.json();
        if (res.ok) window.location.href = `room.html?code=${data.room_code}`;
    } catch (e) {
        alert('สร้างห้องไม่สำเร็จ: ' + e.message);
    }
}

function joinRoom() {
    const input = document.getElementById('join-code-input');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) return alert('กรุณากรอกโค้ดห้องก่อนครับ');
    window.location.href = `room.html?code=${code}`;
}

function renderFoodList() {
    const listElement = document.getElementById('food-list');
    const countElement = document.getElementById('food-count');
    if (countElement) countElement.textContent = `${foods.length} เมนู`;
    if (!listElement) return;
    listElement.innerHTML = '';
    foods.forEach((food, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${food}</span><button onclick="handleRemoveFood(${index})" style="background:none; border:none; color:var(--danger); cursor:pointer;">✕</button>`;
        listElement.appendChild(li);
    });
}

function handleAddFood() {
    const input = document.getElementById('new-food-input');
    if (!input) return;
    const foodName = input.value.trim();
    if (!foodName) return;
    if (!foods.includes(foodName)) {
        foods.push(foodName);
        input.value = '';
        renderFoodList();
    }
}

function handleRemoveFood(index) {
    foods.splice(index, 1);
    renderFoodList();
}