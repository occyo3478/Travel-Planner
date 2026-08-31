document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // State
    // =========================================================

    let trips = [];
    let currentTab = 'upcoming'; // 'upcoming' or 'past'
    let trip = {};               // 현재 상세 페이지의 여행
    let currentView = 'list';    // 'list' or 'calendar'
    let currentCalendarDate = new Date();


    // =========================================================
    // 페이지 구분
    // =========================================================

    const isDetailPage =
        !!document.getElementById('map') &&
        !!document.getElementById('places-list');

    const isAddPage =
        !!document.getElementById('add-btn');

    const isIndexPage =
        !!document.getElementById('trip-list');


    if (isDetailPage) {
        initDetailPage();
    } else if (isAddPage) {
        initAddPage();
    } else if (isIndexPage) {
        initIndexPage();
    }


    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList = document.getElementById('trip-list');
        const calendarView = document.getElementById('calendar-view');
        const emptyState = document.getElementById('empty-state');

        const totalTripsEl = document.getElementById('total-trips');
        const upcomingTripsEl = document.getElementById('upcoming-trips');
        const pastTripsEl = document.getElementById('past-trips');

        const tabBtns = document.querySelectorAll('.tab-btn');
        const viewBtns = document.querySelectorAll('.view-btn');

        const notificationBtn =
            document.getElementById('notification-btn');

        const notificationDropdown =
            document.getElementById('notification-dropdown');

        const notificationList =
            document.getElementById('notification-list');

        // Search
        const searchNameInput =
            document.getElementById('search-name');

        const searchYearSelect =
            document.getElementById('search-year');

        const searchMonthSelect =
            document.getElementById('search-month');

        const searchBtn =
            document.getElementById('search-btn');


        // ---------------------------------------------------------
        // 연도 선택
        // ---------------------------------------------------------

        if (searchYearSelect) {

            const currentYear = new Date().getFullYear();

            for (
                let i = currentYear - 5;
                i <= currentYear + 5;
                i++
            ) {

                const option = document.createElement('option');

                option.value = i;
                option.textContent = `${i}년`;

                searchYearSelect.appendChild(option);
            }

            searchYearSelect.value = '';
        }


        // ---------------------------------------------------------
        // 초기 데이터 로딩
        // ---------------------------------------------------------

        loadTrips().then(() => {
            renderTrips();
            updateStats();
        });


        // ---------------------------------------------------------
        // 탭
        // ---------------------------------------------------------

        tabBtns.forEach(btn => {

            btn.addEventListener('click', () => {

                tabBtns.forEach(b =>
                    b.classList.remove('active')
                );

                btn.classList.add('active');

                currentTab = btn.dataset.tab;

                renderTrips();
            });

        });


        // ---------------------------------------------------------
        // 리스트 / 캘린더
        // ---------------------------------------------------------

        viewBtns.forEach(btn => {

            btn.addEventListener('click', () => {

                const title = btn.getAttribute('title') || '';

                if (title.includes('리스트')) {

                    currentView = 'list';

                    tripList.style.display = 'flex';
                    calendarView.style.display = 'none';

                    if (viewBtns[0]) {
                        viewBtns[0].classList.add('active');
                    }

                    if (viewBtns[1]) {
                        viewBtns[1].classList.remove('active');
                    }

                    renderTrips();

                } else {

                    currentView = 'calendar';

                    tripList.style.display = 'none';
                    calendarView.style.display = 'flex';

                    if (viewBtns[0]) {
                        viewBtns[0].classList.remove('active');
                    }

                    if (viewBtns[1]) {
                        viewBtns[1].classList.add('active');
                    }

                    renderCalendar();
                }

            });

        });


        // ---------------------------------------------------------
        // 달력 이전 / 다음
        // ---------------------------------------------------------

        const prevMonthBtn =
            document.getElementById('prev-month');

        const nextMonthBtn =
            document.getElementById('next-month');


        if (prevMonthBtn) {

            prevMonthBtn.addEventListener('click', () => {

                currentCalendarDate.setMonth(
                    currentCalendarDate.getMonth() - 1
                );

                renderCalendar();
            });
        }


        if (nextMonthBtn) {

            nextMonthBtn.addEventListener('click', () => {

                currentCalendarDate.setMonth(
                    currentCalendarDate.getMonth() + 1
                );

                renderCalendar();
            });
        }


        // ---------------------------------------------------------
        // 알림
        // ---------------------------------------------------------

        if (notificationBtn && notificationDropdown) {

            notificationBtn.addEventListener('click', (e) => {

                e.stopPropagation();

                notificationDropdown.classList.toggle('show');

                if (
                    notificationDropdown.classList.contains('show')
                ) {
                    renderNotifications();
                }

            });

        }


        // ---------------------------------------------------------
        // 프로필
        // ---------------------------------------------------------

        const profileBtn =
            document.getElementById('profile-btn');

        const profileDropdown =
            document.getElementById('profile-dropdown');


        document.addEventListener('click', (e) => {

            if (
                notificationDropdown &&
                notificationBtn &&
                !notificationDropdown.contains(e.target) &&
                !notificationBtn.contains(e.target)
            ) {
                notificationDropdown.classList.remove('show');
            }


            if (
                profileDropdown &&
                profileBtn &&
                !profileDropdown.contains(e.target) &&
                !profileBtn.contains(e.target)
            ) {
                profileDropdown.classList.remove('show');
            }

        });


        if (profileBtn && profileDropdown) {

            profileBtn.addEventListener('click', (e) => {

                e.stopPropagation();

                profileDropdown.classList.toggle('show');

            });

        }


        // ---------------------------------------------------------
        // 검색
        // ---------------------------------------------------------

        if (searchBtn) {
            searchBtn.addEventListener(
                'click',
                performSearch
            );
        }


        if (searchNameInput) {

            searchNameInput.addEventListener(
                'keypress',
                (e) => {

                    if (e.key === 'Enter') {
                        performSearch();
                    }

                }
            );

        }


        // =========================================================
        // 알림 렌더링
        // =========================================================

        function renderNotifications() {

            if (!notificationList) return;

            notificationList.innerHTML = '';

            const today = new Date();

            today.setHours(0, 0, 0, 0);


            const upcomingTrips = trips
                .filter(t => {

                    const start =
                        new Date(t.startDate || t.date);

                    start.setHours(0, 0, 0, 0);

                    return start >= today;
                })
                .sort((a, b) => {

                    return new Date(
                        a.startDate || a.date
                    ) - new Date(
                        b.startDate || b.date
                    );

                });


            if (upcomingTrips.length === 0) {

                notificationList.innerHTML =
                    '<li class="empty-noti">새로운 알림이 없습니다.</li>';

                return;
            }


            upcomingTrips.forEach(t => {

                const start =
                    new Date(t.startDate || t.date);

                start.setHours(0, 0, 0, 0);


                const diffTime =
                    start - today;

                const diffDays =
                    Math.ceil(
                        diffTime /
                        (1000 * 60 * 60 * 24)
                    );


                let dDayText;
                let badgeClass;


                if (diffDays === 0) {

                    dDayText = 'D-Day';
                    badgeClass = 'd-day-today';

                } else {

                    dDayText = `D-${diffDays}`;
                    badgeClass = 'd-day-upcoming';

                }


                const li =
                    document.createElement('li');

                li.className =
                    'notification-item';


                li.innerHTML = `
                    <div class="noti-content">
                        <span class="d-day-badge ${badgeClass}">
                            ${dDayText}
                        </span>

                        <span class="noti-text">
                            <strong>${escapeHtml(t.destination)}</strong>
                            여행이 다가옵니다.
                        </span>
                    </div>
                `;


                li.addEventListener('click', () => {

                    goToDetail(t.id);

                    notificationDropdown.classList.remove(
                        'show'
                    );

                });


                notificationList.appendChild(li);

            });

        }


        // =========================================================
        // 검색
        // =========================================================

        function performSearch() {

            const searchTerm =
                searchNameInput ?
                searchNameInput.value.trim().toLowerCase() :
                '';

            const searchYear =
                searchYearSelect ?
                searchYearSelect.value :
                '';

            const searchMonth =
                searchMonthSelect ?
                searchMonthSelect.value :
                '';


            const filteredTrips =
                trips.filter(t => {

                    const start =
                        t.startDate || t.date;

                    const startDateObj =
                        new Date(start);


                    // 이름
                    const destination =
                        String(t.destination || '')
                            .toLowerCase();

                    const nameMatch =
                        destination.includes(searchTerm);


                    // 연도
                    let yearMatch = true;

                    if (searchYear) {

                        yearMatch =
                            startDateObj
                                .getFullYear()
                                .toString() === searchYear;

                    }


                    // 월
                    let monthMatch = true;

                    if (searchMonth) {

                        monthMatch =
                            (
                                startDateObj.getMonth() + 1
                            ).toString() === searchMonth;

                    }


                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filteredTrips);

        }


        // =========================================================
        // 여행 목록 렌더링
        // =========================================================

        function renderTrips(tripsToRender = trips) {

            if (!tripList) return;


            tripList
                .querySelectorAll('.trip-card')
                .forEach(card => card.remove());


            const today = new Date();

            today.setHours(0, 0, 0, 0);


            let filteredTrips =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate || t.date
                        );

                    start.setHours(0, 0, 0, 0);


                    if (currentTab === 'upcoming') {

                        return start >= today;

                    } else {

                        return start < today;

                    }

                });


            // 날짜순 정렬
            filteredTrips.sort((a, b) => {

                return new Date(
                    a.startDate || a.date
                ) -
                new Date(
                    b.startDate || b.date
                );

            });


            // 지난 여행은 최신순
            if (currentTab === 'past') {
                filteredTrips.reverse();
            }


            if (filteredTrips.length === 0) {

                if (emptyState) {
                    emptyState.style.display = 'flex';
                }

                return;
            }


            if (emptyState) {
                emptyState.style.display = 'none';
            }


            filteredTrips.forEach(t => {

                const card =
                    document.createElement('div');

                card.className =
                    'trip-card';


                card.innerHTML = `
                    <div class="trip-info">
                        <h3>
                            ${escapeHtml(t.destination)}
                        </h3>

                        <p>
                            ${escapeHtml(t.startDate)}
                            ~
                            ${escapeHtml(t.endDate)}
                        </p>
                    </div>

                    <button
                        class="delete-trip-btn"
                        type="button"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;


                // 삭제 버튼
                const deleteBtn =
                    card.querySelector(
                        '.delete-trip-btn'
                    );


                deleteBtn.addEventListener(
                    'click',
                    async (e) => {

                        e.stopPropagation();

                        await deleteTrip(t.id);

                    }
                );


                // 카드 클릭
                card.addEventListener(
                    'click',
                    () => {

                        console.log(
                            '카드 클릭됨!'
                        );

                        console.log(
                            '여행 ID:',
                            t.id
                        );


                        goToDetail(t.id);

                    }
                );


                tripList.appendChild(card);

            });

        }


        // =========================================================
        // 통계
        // =========================================================

        function updateStats() {

            const today = new Date();

            today.setHours(0, 0, 0, 0);


            const upcoming =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate || t.date
                        );

                    date.setHours(0, 0, 0, 0);

                    return date >= today;

                }).length;


            const past =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate || t.date
                        );

                    date.setHours(0, 0, 0, 0);

                    return date < today;

                }).length;


            if (totalTripsEl) {
                totalTripsEl.textContent =
                    trips.length;
            }


            if (upcomingTripsEl) {
                upcomingTripsEl.textContent =
                    upcoming;
            }


            if (pastTripsEl) {
                pastTripsEl.textContent =
                    past;
            }

        }


        // =========================================================
        // 달력
        // =========================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );

            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid || !monthDisplay) {
                return;
            }


            grid.innerHTML = '';


            const year =
                currentCalendarDate.getFullYear();

            const month =
                currentCalendarDate.getMonth();


            monthDisplay.textContent =
                `${year}년 ${month + 1}월`;


            const firstDay =
                new Date(year, month, 1);

            const lastDay =
                new Date(year, month + 1, 0);


            const daysInMonth =
                lastDay.getDate();

            const startDay =
                firstDay.getDay();


            // 빈 칸
            for (let i = 0; i < startDay; i++) {

                const div =
                    document.createElement('div');

                div.className =
                    'calendar-day empty';

                grid.appendChild(div);

            }


            // 날짜
            for (
                let i = 1;
                i <= daysInMonth;
                i++
            ) {

                const div =
                    document.createElement('div');

                div.className =
                    'calendar-day';


                div.appendChild(
                    document.createTextNode(i)
                );


                const dateStr =
                    `${year}-${String(month + 1)
                        .padStart(2, '0')}-${String(i)
                        .padStart(2, '0')}`;


                const daysTrips =
                    trips.filter(t => {

                        const start =
                            t.startDate || t.date;

                        const end =
                            t.endDate || start;


                        return (
                            dateStr >= start &&
                            dateStr <= end
                        );

                    });


                if (daysTrips.length > 0) {

                    div.classList.add(
                        'has-trip'
                    );


                    daysTrips.forEach(t => {

                        const label =
                            document.createElement(
                                'div'
                            );

                        label.className =
                            'trip-label';

                        label.textContent =
                            t.destination;

                        label.title =
                            t.destination;


                        label.addEventListener(
                            'click',
                            (e) => {

                                e.stopPropagation();

                                goToDetail(t.id);

                            }
                        );


                        div.appendChild(label);

                    });

                }


                grid.appendChild(div);

            }

        }

    }


    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById('add-btn');

        const destinationInput =
            document.getElementById('destination');

        const startDateInput =
            document.getElementById('start-date');

        const endDateInput =
            document.getElementById('end-date');

        const activityInput =
            document.getElementById('activity');


        if (!addBtn) return;


        addBtn.addEventListener(
            'click',
            async () => {

                const destination =
                    destinationInput.value.trim();

                const startDate =
                    startDateInput.value;

                const endDate =
                    endDateInput.value;

                const activity =
                    activityInput.value.trim();


                // 필수 입력
                if (
                    !destination ||
                    !startDate ||
                    !endDate
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;
                }


                // 날짜 검사
                if (endDate < startDate) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;
                }


                const newTrip = {

                    id: Date.now(),

                    destination:
                        destination,

                    startDate:
                        startDate,

                    endDate:
                        endDate,

                    activity:
                        activity,

                    places: []

                };


                try {

                    await db.collection('trips')
                        .doc(String(newTrip.id))
                        .set(newTrip);


                    console.log(
                        '새 일정 저장 완료:',
                        newTrip
                    );


                    window.location.href =
                        'index.html';


                } catch (error) {

                    console.error(
                        '새 일정 저장 실패:',
                        error
                    );

                    alert(
                        '여행 일정 저장에 실패했습니다.'
                    );

                }

            }
        );

    }


    // =========================================================
    // DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        // Firestore에서 여행 목록 가져오기
        await loadTrips();


        const urlParams =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            urlParams.get('id');


        console.log(
            '상세 페이지 ID:',
            tripId
        );


        // ID는 문자열/숫자 상관없이 비교
        trip =
            trips.find(
                t =>
                    String(t.id) ===
                    String(tripId)
            );


        if (!trip) {

            alert(
                '여행 정보를 찾을 수 없습니다.'
            );

            window.location.href =
                'index.html';

            return;
        }


        console.log(
            '현재 여행:',
            trip
        );


        // ---------------------------------------------------------
        // 기본 정보
        // ---------------------------------------------------------

        const titleEl =
            document.getElementById(
                'trip-title'
            );

        const datesEl =
            document.getElementById(
                'trip-dates'
            );


        if (titleEl) {
            titleEl.textContent =
                trip.destination;
        }


        if (datesEl) {
            datesEl.textContent =
                `${trip.startDate} ~ ${trip.endDate}`;
        }


        // ---------------------------------------------------------
        // 지도
        // ---------------------------------------------------------

        const map =
            L.map('map')
                .setView(
                    [37.5665, 126.9780],
                    10
                );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19
            }
        ).addTo(map);


        // ---------------------------------------------------------
        // 요소
        // ---------------------------------------------------------

        const placeInput =
            document.getElementById(
                'place-input'
            );

        const addPlaceBtn =
            document.getElementById(
                'add-place-btn'
            );

        const placesList =
            document.getElementById(
                'places-list'
            );

        const optimizeBtn =
            document.getElementById(
                'optimize-btn'
            );


        // 초기 장소
        renderPlaces();


        // =========================================================
        // 장소 추가
        // =========================================================

        if (addPlaceBtn) {

            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        if (placeInput) {

            placeInput.addEventListener(
                'keypress',
                (e) => {

                    if (e.key === 'Enter') {
                        addPlace();
                    }

                }
            );

        }


        async function addPlace() {

            const placeName =
                placeInput.value.trim();


            if (!placeName) {
                return;
            }


            try {

                addPlaceBtn.disabled = true;


                const response =
                    await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`
                    );


                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }


                const data =
                    await response.json();


                if (
                    !data ||
                    data.length === 0
                ) {

                    alert(
                        '장소를 찾을 수 없습니다.'
                    );

                    return;
                }


                const result =
                    data[0];


                const newPlace = {

                    id: Date.now(),

                    name:
                        placeName,

                    lat:
                        parseFloat(
                            result.lat
                        ),

                    lng:
                        parseFloat(
                            result.lon
                        ),

                    isLocked:
                        false

                };


                if (!Array.isArray(trip.places)) {
                    trip.places = [];
                }


                trip.places.push(
                    newPlace
                );


                // ★ 현재 trip만 저장
                await saveTrip(trip);


                renderPlaces();


                placeInput.value = '';


                console.log(
                    '장소 추가 완료:',
                    newPlace
                );


            } catch (error) {

                console.error(
                    'Geocoding error:',
                    error
                );

                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            } finally {

                addPlaceBtn.disabled = false;

            }

        }


        // =========================================================
        // 경로 최적화
        // =========================================================

        if (optimizeBtn) {

            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        async function optimizeRoute() {

            if (
                !trip.places ||
                trip.places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );

                return;
            }


            const originalOrderJSON =
                JSON.stringify(
                    trip.places.map(
                        p => p.id
                    )
                );


            const places =
                [...trip.places];


            const lockedPlaces = [];
            const unlockedPlaces = [];


            places.forEach((p, i) => {

                if (p.isLocked) {

                    lockedPlaces.push({
                        place: p,
                        index: i
                    });

                } else {

                    unlockedPlaces.push(p);

                }

            });


            if (unlockedPlaces.length < 2) {

                alert(
                    '최적화할 수 있는(잠금 해제된) 장소가 부족합니다.'
                );

                return;
            }


            // -----------------------------------------------------
            // 고정 위치에 잠긴 장소를 유지
            // -----------------------------------------------------

            function reconstructPath(
                currentUnlocked
            ) {

                const fullPath =
                    new Array(
                        places.length
                    ).fill(null);


                lockedPlaces.forEach(lp => {

                    fullPath[lp.index] =
                        lp.place;

                });


                let uIdx = 0;


                for (
                    let i = 0;
                    i < fullPath.length;
                    i++
                ) {

                    if (!fullPath[i]) {

                        fullPath[i] =
                            currentUnlocked[
                                uIdx++
                            ];

                    }

                }


                return fullPath;
            }


            // -----------------------------------------------------
            // 거리 계산
            // -----------------------------------------------------

            function calculateTotalDistance(
                route
            ) {

                let dist = 0;


                for (
                    let i = 0;
                    i < route.length - 1;
                    i++
                ) {

                    dist +=
                        L.latLng(
                            route[i].lat,
                            route[i].lng
                        ).distanceTo(
                            L.latLng(
                                route[i + 1].lat,
                                route[i + 1].lng
                            )
                        );

                }


                return dist;
            }


            // -----------------------------------------------------
            // 초기값
            // -----------------------------------------------------

            let currentSolution =
                [...unlockedPlaces];


            let currentFullRoute =
                reconstructPath(
                    currentSolution
                );


            let currentDist =
                calculateTotalDistance(
                    currentFullRoute
                );


            // -----------------------------------------------------
            // Simulated Annealing
            // -----------------------------------------------------

            let temp = 10000;

            const coolingRate =
                0.995;


            let bestSolution =
                [...currentSolution];

            let bestDist =
                currentDist;


            for (
                let i = 0;
                i < 2500;
                i++
            ) {

                let newSolution =
                    [...currentSolution];


                // 2-opt
                if (
                    Math.random() < 0.8 &&
                    newSolution.length > 2
                ) {

                    let idx1 =
                        Math.floor(
                            Math.random() *
                            newSolution.length
                        );


                    let idx2 =
                        Math.floor(
                            Math.random() *
                            newSolution.length
                        );


                    const start =
                        Math.min(
                            idx1,
                            idx2
                        );


                    const end =
                        Math.max(
                            idx1,
                            idx2
                        );


                    const section =
                        newSolution
                            .slice(
                                start,
                                end + 1
                            )
                            .reverse();


                    newSolution.splice(
                        start,
                        section.length,
                        ...section
                    );


                } else {

                    // Swap

                    const idx1 =
                        Math.floor(
                            Math.random() *
                            newSolution.length
                        );


                    const idx2 =
                        Math.floor(
                            Math.random() *
                            newSolution.length
                        );


                    [
                        newSolution[idx1],
                        newSolution[idx2]
                    ] = [
                        newSolution[idx2],
                        newSolution[idx1]
                    ];

                }


                const newFullRoute =
                    reconstructPath(
                        newSolution
                    );


                const newDist =
                    calculateTotalDistance(
                        newFullRoute
                    );


                // acceptance
                if (
                    newDist < currentDist ||
                    Math.random() <
                    Math.exp(
                        (currentDist - newDist) /
                        temp
                    )
                ) {

                    currentSolution =
                        newSolution;

                    currentDist =
                        newDist;


                    if (
                        newDist < bestDist
                    ) {

                        bestSolution =
                            [...newSolution];

                        bestDist =
                            newDist;

                    }

                }


                temp *= coolingRate;

            }


            // -----------------------------------------------------
            // 결과 적용
            // -----------------------------------------------------

            const finalFullRoute =
                reconstructPath(
                    bestSolution
                );


            const newOrderJSON =
                JSON.stringify(
                    finalFullRoute.map(
                        p => p.id
                    )
                );


            const distKm =
                (bestDist / 1000)
                    .toFixed(1);


            trip.places =
                finalFullRoute;


            // ★ Firestore에 현재 여행 저장
            await saveTrip(trip);


            renderPlaces();


            if (
                originalOrderJSON ===
                newOrderJSON
            ) {

                alert(
                    `이미 최적의 경로입니다! (총 거리: ${distKm}km)`
                );

            } else {

                alert(
                    `경로를 최적화했습니다! (총 거리: ${distKm}km)`
                );

            }

        }


        // =========================================================
        // 장소 잠금
        // =========================================================

        window.toggleLock =
            async function (id) {

                if (!trip.places) {
                    return;
                }


                const place =
                    trip.places.find(
                        p =>
                            String(p.id) ===
                            String(id)
                    );


                if (!place) {
                    return;
                }


                place.isLocked =
                    !place.isLocked;


                await saveTrip(trip);


                renderPlaces();

            };


        // =========================================================
        // 장소 렌더링
        // =========================================================

        function renderPlaces() {

            placesList.innerHTML = '';


            // 기존 마커 / 선 제거
            map.eachLayer(layer => {

                if (
                    layer instanceof L.Marker ||
                    layer instanceof L.Polyline
                ) {

                    map.removeLayer(layer);

                }

            });


            if (
                !trip.places ||
                trip.places.length === 0
            ) {

                placesList.innerHTML =
                    `
                    <div class="empty-places">
                        <p>방문할 장소를 추가해보세요!</p>
                    </div>
                    `;

                return;
            }


            const latlngs = [];


            trip.places.forEach(
                (place, index) => {

                    const item =
                        document.createElement('div');


                    item.className =
                        `place-item ${
                            place.isLocked
                                ? 'locked'
                                : ''
                        }`;


                    item.draggable =
                        !place.isLocked;


                    // ★ ID 저장
                    item.dataset.placeId =
                        String(place.id);


                    item.innerHTML = `
                        <span class="place-number">
                            ${index + 1}
                        </span>

                        <span class="place-name">
                            ${escapeHtml(place.name)}
                        </span>

                        <button
                            class="lock-btn ${
                                place.isLocked
                                    ? 'active'
                                    : ''
                            }"
                            type="button"
                        >
                            <i class="fa-solid ${
                                place.isLocked
                                    ? 'fa-lock'
                                    : 'fa-lock-open'
                            }"></i>
                        </button>

                        <button
                            class="remove-place-btn"
                            type="button"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    `;


                    // -------------------------------------------------
                    // 잠금 버튼
                    // -------------------------------------------------

                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    lockBtn.addEventListener(
                        'click',
                        async (e) => {

                            e.stopPropagation();

                            await window.toggleLock(
                                place.id
                            );

                        }
                    );


                    // -------------------------------------------------
                    // 삭제 버튼
                    // -------------------------------------------------

                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    removeBtn.addEventListener(
                        'click',
                        async (e) => {

                            e.stopPropagation();

                            await removePlace(
                                place.id
                            );

                        }
                    );


                    // -------------------------------------------------
                    // 드래그
                    // -------------------------------------------------

                    if (!place.isLocked) {

                        item.addEventListener(
                            'dragstart',
                            () => {

                                item.classList.add(
                                    'dragging'
                                );

                            }
                        );


                        item.addEventListener(
                            'dragend',
                            async () => {

                                item.classList.remove(
                                    'dragging'
                                );


                                await updateOrder();

                            }
                        );

                    }


                    placesList.appendChild(
                        item
                    );


                    // -------------------------------------------------
                    // 지도 마커
                    // -------------------------------------------------

                    L.marker([
                        place.lat,
                        place.lng
                    ])
                    .addTo(map)
                    .bindPopup(
                        `${index + 1}. ${
                            escapeHtml(place.name)
                        }`
                    );


                    latlngs.push([
                        place.lat,
                        place.lng
                    ]);

                }
            );


            // ---------------------------------------------------------
            // 경로
            // ---------------------------------------------------------

            if (latlngs.length > 1) {

                L.polyline(
                    latlngs,
                    {
                        color: 'blue'
                    }
                ).addTo(map);


                map.fitBounds(
                    latlngs
                );

            } else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    13
                );

            }

        }


        // =========================================================
        // Drag Over
        // =========================================================

        placesList.addEventListener(
            'dragover',
            e => {

                e.preventDefault();


                const draggable =
                    placesList.querySelector(
                        '.dragging'
                    );


                if (!draggable) {
                    return;
                }


                const afterElement =
                    getDragAfterElement(
                        placesList,
                        e.clientY
                    );


                if (
                    afterElement == null
                ) {

                    placesList.appendChild(
                        draggable
                    );

                } else {

                    placesList.insertBefore(
                        draggable,
                        afterElement
                    );

                }

            }
        );


        // =========================================================
        // 드래그 위치 계산
        // =========================================================

        function getDragAfterElement(
            container,
            y
        ) {

            const draggableElements =
                [
                    ...container.querySelectorAll(
                        '.place-item:not(.dragging):not(.locked)'
                    )
                ];


            return draggableElements.reduce(
                (closest, child) => {

                    const box =
                        child.getBoundingClientRect();


                    const offset =
                        y -
                        box.top -
                        box.height / 2;


                    if (
                        offset < 0 &&
                        offset > closest.offset
                    ) {

                        return {
                            offset:
                                offset,
                            element:
                                child
                        };

                    }


                    return closest;

                },
                {
                    offset:
                        Number.NEGATIVE_INFINITY
                }
            ).element;

        }


        // =========================================================
        // ★ 드래그 후 실제 배열 순서 변경
        // =========================================================

        async function updateOrder() {

            const items =
                [
                    ...placesList.querySelectorAll(
                        '.place-item'
                    )
                ];


            const newPlaces = [];


            items.forEach(item => {

                const id =
                    item.dataset.placeId;


                const found =
                    trip.places.find(
                        p =>
                            String(p.id) ===
                            String(id)
                    );


                if (found) {
                    newPlaces.push(found);
                }

            });


            // 혹시 누락된 장소가 있으면
            // 기존 데이터 유지
            if (
                newPlaces.length !==
                trip.places.length
            ) {

                console.warn(
                    '장소 순서 변경 중 데이터 누락 발생'
                );

                return;
            }


            trip.places =
                newPlaces;


            console.log(
                '새로운 장소 순서:',
                trip.places
            );


            // Firestore 저장
            await saveTrip(trip);


            // 번호 / 지도 경로 갱신
            renderPlaces();

        }


        // =========================================================
        // 장소 삭제
        // =========================================================

        async function removePlace(id) {

            if (!trip.places) {
                return;
            }


            const place =
                trip.places.find(
                    p =>
                        String(p.id) ===
                        String(id)
                );


            if (!place) {
                return;
            }


            if (
                !confirm(
                    `"${place.name}" 장소를 삭제하시겠습니까?`
                )
            ) {
                return;
            }


            trip.places =
                trip.places.filter(
                    p =>
                        String(p.id) !==
                        String(id)
                );


            // ★ 현재 여행 저장
            await saveTrip(trip);


            renderPlaces();

        }


        window.removePlace =
            removePlace;

    }


    // =========================================================
    // Firestore - 전체 여행 불러오기
    // =========================================================

    async function loadTrips() {

        try {

            const snapshot =
                await db
                    .collection('trips')
                    .get();


            trips =
                snapshot.docs.map(
                    doc => {

                        const data =
                            doc.data();


                        console.log(
                            'Firestore 문서:',
                            doc.id,
                            data
                        );


                        return {

                            // ★ 항상 문자열 ID
                            id:
                                String(doc.id),

                            destination:
                                data.destination ||
                                data.name ||
                                '',

                            startDate:
                                data.startDate ||
                                data.date ||
                                '',

                            endDate:
                                data.endDate ||
                                data.startDate ||
                                data.date ||
                                '',

                            activity:
                                data.activity ||
                                '',

                            places:
                                Array.isArray(
                                    data.places
                                )
                                    ? data.places
                                    : []

                        };

                    }
                );


            console.log(
                '최종 trips:',
                trips
            );


        } catch (error) {

            console.error(
                'Firestore에서 일정 불러오기 실패:',
                error
            );


            alert(
                '여행 일정을 불러오지 못했습니다.'
            );


            trips = [];

        }

    }


    // =========================================================
    // ★ Firestore - 여행 하나만 저장
    // =========================================================

    async function saveTrip(tripData) {

        try {

            if (
                !tripData ||
                tripData.id === undefined ||
                tripData.id === null
            ) {

                console.error(
                    '저장할 여행 데이터가 없습니다.',
                    tripData
                );

                return false;
            }


            const docRef =
                db.collection('trips')
                    .doc(
                        String(tripData.id)
                    );


            await docRef.set(
                {

                    id:
                        String(tripData.id),

                    destination:
                        tripData.destination ||
                        '',

                    startDate:
                        tripData.startDate ||
                        '',

                    endDate:
                        tripData.endDate ||
                        '',

                    activity:
                        tripData.activity ||
                        '',

                    places:
                        Array.isArray(
                            tripData.places
                        )
                            ? tripData.places
                            : []

                },
                {
                    merge: true
                }
            );


            console.log(
                'Firestore 저장 완료:',
                tripData.id
            );


            return true;


        } catch (error) {

            console.error(
                'Firestore 저장 실패:',
                error
            );


            alert(
                '여행 일정 저장에 실패했습니다.'
            );


            return false;

        }

    }


    // =========================================================
    // ★ 여행 삭제 - Firestore 실제 문서 삭제
    // =========================================================

    async function deleteTrip(id) {

        if (
            !confirm(
                '정말 이 여행 일정을 삭제하시겠습니까?'
            )
        ) {
            return;
        }


        try {

            await db.collection('trips')
                .doc(String(id))
                .delete();


            // 로컬 배열에서도 제거
            trips =
                trips.filter(
                    t =>
                        String(t.id) !==
                        String(id)
                );


            console.log(
                '여행 삭제 완료:',
                id
            );


            // 현재 페이지가 index라면
            const tripList =
                document.getElementById(
                    'trip-list'
                );


            if (tripList) {

                // 현재 페이지의 렌더링 상태 갱신
                const emptyState =
                    document.getElementById(
                        'empty-state'
                    );


                const today = new Date();

                today.setHours(
                    0, 0, 0, 0
                );


                let filteredTrips =
                    trips.filter(t => {

                        const date =
                            new Date(
                                t.startDate ||
                                t.date
                            );

                        date.setHours(
                            0, 0, 0, 0
                        );


                        if (
                            currentTab ===
                            'upcoming'
                        ) {

                            return date >= today;

                        }


                        return date < today;

                    });


                filteredTrips.sort(
                    (a, b) =>
                        new Date(
                            a.startDate ||
                            a.date
                        ) -
                        new Date(
                            b.startDate ||
                            b.date
                        )
                );


                if (
                    currentTab ===
                    'past'
                ) {
                    filteredTrips.reverse();
                }


                // 직접 다시 그리기
                tripList
                    .querySelectorAll(
                        '.trip-card'
                    )
                    .forEach(
                        card =>
                            card.remove()
                    );


                if (
                    filteredTrips.length === 0
                ) {

                    if (emptyState) {
                        emptyState.style.display =
                            'flex';
                    }

                } else {

                    if (emptyState) {
                        emptyState.style.display =
                            'none';
                    }


                    filteredTrips.forEach(
                        t => {

                            const card =
                                document.createElement(
                                    'div'
                                );


                            card.className =
                                'trip-card';


                            card.innerHTML = `
                                <div class="trip-info">
                                    <h3>
                                        ${escapeHtml(t.destination)}
                                    </h3>

                                    <p>
                                        ${escapeHtml(t.startDate)}
                                        ~
                                        ${escapeHtml(t.endDate)}
                                    </p>
                                </div>

                                <button
                                    class="delete-trip-btn"
                                    type="button"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            `;


                            const deleteBtn =
                                card.querySelector(
                                    '.delete-trip-btn'
                                );


                            deleteBtn.addEventListener(
                                'click',
                                async e => {

                                    e.stopPropagation();

                                    await deleteTrip(
                                        t.id
                                    );

                                }
                            );


                            card.addEventListener(
                                'click',
                                () => {

                                    goToDetail(
                                        t.id
                                    );

                                }
                            );


                            tripList.appendChild(
                                card
                            );

                        }
                    );

                }


                updateStatsGlobal();

            }


        } catch (error) {

            console.error(
                '여행 삭제 실패:',
                error
            );


            alert(
                '여행 일정 삭제에 실패했습니다.'
            );

        }

    }


    // =========================================================
    // 통계 갱신용
    // =========================================================

    function updateStatsGlobal() {

        const totalTripsEl =
            document.getElementById(
                'total-trips'
            );

        const upcomingTripsEl =
            document.getElementById(
                'upcoming-trips'
            );

        const pastTripsEl =
            document.getElementById(
                'past-trips'
            );


        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );


        const upcoming =
            trips.filter(t => {

                const date =
                    new Date(
                        t.startDate ||
                        t.date
                    );

                date.setHours(
                    0,
                    0,
                    0,
                    0
                );

                return date >= today;

            }).length;


        const past =
            trips.filter(t => {

                const date =
                    new Date(
                        t.startDate ||
                        t.date
                    );

                date.setHours(
                    0,
                    0,
                    0,
                    0
                );

                return date < today;

            }).length;


        if (totalTripsEl) {
            totalTripsEl.textContent =
                trips.length;
        }


        if (upcomingTripsEl) {
            upcomingTripsEl.textContent =
                upcoming;
        }


        if (pastTripsEl) {
            pastTripsEl.textContent =
                past;
        }

    }


    // =========================================================
    // 상세 페이지 이동
    // =========================================================

    function goToDetail(id) {

        console.log(
            '상세 페이지 이동:',
            id
        );


        const url =
            `trip_detail.html?id=${
                encodeURIComponent(
                    String(id)
                )
            }`;


        console.log(
            '이동할 URL:',
            url
        );


        window.location.href =
            url;

    }


    // =========================================================
    // HTML 안전 처리
    // =========================================================

    function escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    }

});
