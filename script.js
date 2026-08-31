document.addEventListener('DOMContentLoaded', async () => {

    let trips = [];
    let currentTrip = null;

    // =========================
    // 페이지 확인
    // =========================

    const isDetailPage =
        document.getElementById('map') &&
        document.getElementById('places-list');

    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    // =========================
    // Firestore에서 일정 불러오기
    // =========================

    async function loadTrips() {
        try {
            const snapshot = await db.collection('trips').get();

            trips = snapshot.docs.map(doc => {
                const data = doc.data();

                return {
                    id: String(doc.id),
                    destination: data.destination || data.name || '',
                    startDate: data.startDate || data.date || '',
                    endDate: data.endDate || data.startDate || data.date || '',
                    activity: data.activity || '',
                    places: Array.isArray(data.places)
                        ? data.places
                        : []
                };
            });

            console.log('Firestore 일정:', trips);

            return trips;

        } catch (error) {
            console.error('Firestore 불러오기 실패:', error);
            alert('여행 일정을 불러오지 못했습니다.');
            return [];
        }
    }


    // =========================
    // 일정 하나 저장
    // =========================

    async function saveTrip(trip) {
        try {
            await db.collection('trips')
                .doc(String(trip.id))
                .set({
                    id: trip.id,
                    destination: trip.destination,
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                    activity: trip.activity || '',
                    places: trip.places || []
                }, {
                    merge: true
                });

            console.log('Firestore 저장 완료');

        } catch (error) {
            console.error('Firestore 저장 실패:', error);
            alert('저장에 실패했습니다.');
        }
    }


    // =========================
    // INDEX 페이지
    // =========================

    async function initIndexPage() {

        const tripList = document.getElementById('trip-list');
        const emptyState = document.getElementById('empty-state');

        await loadTrips();

        renderTripList();

        function renderTripList() {

            if (!tripList) return;

            tripList.querySelectorAll('.trip-card').forEach(card => {
                card.remove();
            });

            if (trips.length === 0) {

                if (emptyState) {
                    emptyState.style.display = 'flex';
                }

                return;
            }

            if (emptyState) {
                emptyState.style.display = 'none';
            }

            trips.forEach(trip => {

                const card = document.createElement('div');

                card.className = 'trip-card';

                card.innerHTML = `
                    <div class="trip-info">
                        <h3>${escapeHTML(trip.destination)}</h3>
                        <p>${trip.startDate} ~ ${trip.endDate}</p>
                    </div>

                    <button class="delete-trip-btn">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;

                // 카드 클릭 → 상세 페이지
                card.addEventListener('click', function (event) {

                    if (event.target.closest('.delete-trip-btn')) {
                        return;
                    }

                    console.log('상세 페이지 이동:', trip.id);

                    window.location.href =
                        `trip_detail.html?id=${encodeURIComponent(trip.id)}`;
                });


                // 삭제
                const deleteBtn =
                    card.querySelector('.delete-trip-btn');

                deleteBtn.addEventListener('click', async function (event) {

                    event.stopPropagation();

                    if (!confirm('정말 이 여행 일정을 삭제하시겠습니까?')) {
                        return;
                    }

                    try {

                        await db.collection('trips')
                            .doc(String(trip.id))
                            .delete();

                        trips = trips.filter(
                            t => String(t.id) !== String(trip.id)
                        );

                        renderTripList();

                    } catch (error) {

                        console.error('삭제 실패:', error);
                        alert('삭제에 실패했습니다.');

                    }
                });


                tripList.appendChild(card);
            });
        }
    }


    // =========================
    // ADD 페이지
    // =========================

    async function initAddPage() {

        const addBtn = document.getElementById('add-btn');

        const destinationInput =
            document.getElementById('destination');

        const startDateInput =
            document.getElementById('start-date');

        const endDateInput =
            document.getElementById('end-date');

        const activityInput =
            document.getElementById('activity');


        addBtn.addEventListener('click', async () => {

            const destination =
                destinationInput.value.trim();

            const startDate =
                startDateInput.value;

            const endDate =
                endDateInput.value;

            const activity =
                activityInput.value.trim();


            if (!destination || !startDate || !endDate) {

                alert('필수 정보를 입력해주세요.');
                return;
            }


            const newTrip = {

                id: String(Date.now()),

                destination: destination,

                startDate: startDate,

                endDate: endDate,

                activity: activity,

                places: []
            };


            try {

                await saveTrip(newTrip);

                alert('여행 일정이 저장되었습니다.');

                window.location.href = 'index.html';

            } catch (error) {

                console.error(error);

                alert('여행 일정 저장에 실패했습니다.');
            }
        });
    }


    // =========================
    // 상세 페이지
    // =========================

    async function initDetailPage() {

        console.log('===== 상세 페이지 시작 =====');


        // Firestore에서 일정 불러오기
        await loadTrips();


        // URL에서 id 가져오기
        const params =
            new URLSearchParams(window.location.search);

        const tripId =
            params.get('id');


        console.log('URL 여행 ID:', tripId);


        if (!tripId) {

            alert('여행 ID가 없습니다.');

            window.location.href = 'index.html';

            return;
        }


        // 여행 찾기
        currentTrip = trips.find(
            t => String(t.id) === String(tripId)
        );


        console.log('찾은 여행:', currentTrip);


        if (!currentTrip) {

            alert('여행 정보를 찾을 수 없습니다.');

            window.location.href = 'index.html';

            return;
        }


        // =========================
        // 제목
        // =========================

        const title =
            document.getElementById('trip-title');

        const dates =
            document.getElementById('trip-dates');


        if (title) {
            title.textContent =
                currentTrip.destination;
        }

        if (dates) {
            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;
        }


        // =========================
        // Leaflet 지도
        // =========================

        const mapElement =
            document.getElementById('map');


        if (!mapElement) {

            console.error(
                'HTML에 id="map" 요소가 없습니다.'
            );

            return;
        }


        // Leaflet이 로드됐는지 확인
        if (typeof L === 'undefined') {

            console.error(
                'Leaflet L 객체가 없습니다.'
            );

            alert(
                '지도 라이브러리(Leaflet)가 로드되지 않았습니다.'
            );

            return;
        }


        console.log('Leaflet 로드 확인 완료');


        const map =
            L.map('map').setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
            }
        ).addTo(map);


        // =========================
        // 장소 관련 요소
        // =========================

        const placeInput =
            document.getElementById('place-input');

        const addPlaceBtn =
            document.getElementById('add-place-btn');

        const placesList =
            document.getElementById('places-list');


        // 기존 장소 표시
        renderPlaces();


        // =========================
        // 장소 추가
        // =========================

        if (addPlaceBtn) {

            addPlaceBtn.addEventListener(
                'click',
                async () => {

                    const placeName =
                        placeInput.value.trim();


                    if (!placeName) {

                        alert('장소를 입력해주세요.');

                        return;
                    }


                    try {

                        const response =
                            await fetch(
                                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(placeName)}`
                            );


                        if (!response.ok) {

                            throw new Error(
                                '장소 검색 실패'
                            );
                        }


                        const data =
                            await response.json();


                        if (!data || data.length === 0) {

                            alert('장소를 찾을 수 없습니다.');

                            return;
                        }


                        const result = data[0];


                        const newPlace = {

                            id: String(Date.now()),

                            name: placeName,

                            lat: Number(result.lat),

                            lng: Number(result.lon),

                            isLocked: false
                        };


                        if (!Array.isArray(currentTrip.places)) {

                            currentTrip.places = [];
                        }


                        currentTrip.places.push(newPlace);


                        await saveTrip(currentTrip);


                        placeInput.value = '';


                        renderPlaces();


                    } catch (error) {

                        console.error(
                            '장소 추가 오류:',
                            error
                        );

                        alert(
                            '장소를 추가하는 중 오류가 발생했습니다.'
                        );
                    }
                }
            );
        }


        // =========================
        // 장소 렌더링
        // =========================

        function renderPlaces() {

            if (!placesList) return;


            placesList.innerHTML = '';


            // 기존 마커 제거
            map.eachLayer(layer => {

                if (
                    layer instanceof L.Marker ||
                    layer instanceof L.Polyline
                ) {

                    map.removeLayer(layer);
                }
            });


            const places =
                currentTrip.places || [];


            if (places.length === 0) {

                placesList.innerHTML = `
                    <div class="empty-places">
                        <p>방문할 장소를 추가해보세요!</p>
                    </div>
                `;

                return;
            }


            const latlngs = [];


            places.forEach((place, index) => {

                // 리스트
                const item =
                    document.createElement('div');

                item.className = 'place-item';


                item.innerHTML = `

                    <span class="place-number">
                        ${index + 1}
                    </span>

                    <span class="place-name">
                        ${escapeHTML(place.name)}
                    </span>

                    <button
                        class="remove-place-btn"
                        data-id="${place.id}"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;


                const removeBtn =
                    item.querySelector(
                        '.remove-place-btn'
                    );


                removeBtn.addEventListener(
                    'click',
                    async () => {

                        currentTrip.places =
                            currentTrip.places.filter(
                                p =>
                                    String(p.id) !==
                                    String(place.id)
                            );


                        await saveTrip(currentTrip);

                        renderPlaces();
                    }
                );


                placesList.appendChild(item);


                // 지도 마커
                const marker =
                    L.marker([
                        place.lat,
                        place.lng
                    ]).addTo(map);


                marker.bindPopup(
                    `${index + 1}. ${escapeHTML(place.name)}`
                );


                latlngs.push([
                    place.lat,
                    place.lng
                ]);
            });


            // 경로
            if (latlngs.length > 1) {

                L.polyline(
                    latlngs
                ).addTo(map);


                map.fitBounds(latlngs);
            }


            if (latlngs.length === 1) {

                map.setView(
                    latlngs[0],
                    13
                );
            }
        }
    }


    // =========================
    // HTML 문자 처리
    // =========================

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    // =========================
    // 실행
    // =========================

    try {

        if (isDetailPage) {

            await initDetailPage();

        } else if (isAddPage) {

            await initAddPage();

        } else if (isIndexPage) {

            await initIndexPage();

        } else {

            console.log(
                '알 수 없는 페이지입니다.'
            );
        }

    } catch (error) {

        console.error(
            '페이지 초기화 오류:',
            error
        );

    }

});    // INDEX PAGE
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

        const profileBtn =
            document.getElementById('profile-btn');

        const profileDropdown =
            document.getElementById('profile-dropdown');

        // 검색
        const searchNameInput =
            document.getElementById('search-name');

        const searchYearSelect =
            document.getElementById('search-year');

        const searchMonthSelect =
            document.getElementById('search-month');

        const searchBtn =
            document.getElementById('search-btn');


        // ================================
        // 연도 선택
        // ================================
        if (searchYearSelect) {
            const currentYear = new Date().getFullYear();

            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {
                const option = document.createElement('option');

                option.value = String(year);
                option.textContent = `${year}년`;

                searchYearSelect.appendChild(option);
            }

            searchYearSelect.value = '';
        }


        // ================================
        // 데이터 불러오기
        // ================================
        loadTrips()
            .then(() => {
                renderTrips();
                updateStats();

                if (currentView === 'calendar') {
                    renderCalendar();
                }
            });


        // ================================
        // 탭 버튼
        // ================================
        tabBtns.forEach(btn => {

            btn.addEventListener('click', () => {

                tabBtns.forEach(b =>
                    b.classList.remove('active')
                );

                btn.classList.add('active');

                currentTab = btn.dataset.tab || 'upcoming';

                renderTrips();
            });

        });


        // ================================
        // 리스트 / 캘린더 버튼
        // ================================
        viewBtns.forEach(btn => {

            btn.addEventListener('click', () => {

                const title = btn.getAttribute('title') || '';

                if (title.includes('리스트')) {

                    currentView = 'list';

                    if (tripList) {
                        tripList.style.display = 'flex';
                    }

                    if (calendarView) {
                        calendarView.style.display = 'none';
                    }

                    if (viewBtns[0]) {
                        viewBtns[0].classList.add('active');
                    }

                    if (viewBtns[1]) {
                        viewBtns[1].classList.remove('active');
                    }

                    renderTrips();

                } else {

                    currentView = 'calendar';

                    if (tripList) {
                        tripList.style.display = 'none';
                    }

                    if (calendarView) {
                        calendarView.style.display = 'flex';
                    }

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


        // ================================
        // 이전 / 다음 달
        // ================================
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


        // ================================
        // 알림
        // ================================
        if (notificationBtn && notificationDropdown) {

            notificationBtn.addEventListener('click', event => {

                event.stopPropagation();

                notificationDropdown.classList.toggle('show');

                if (
                    notificationDropdown.classList.contains('show')
                ) {
                    renderNotifications();
                }

            });

        }


        // ================================
        // 프로필
        // ================================
        if (profileBtn && profileDropdown) {

            profileBtn.addEventListener('click', event => {

                event.stopPropagation();

                profileDropdown.classList.toggle('show');
            });

        }


        // ================================
        // 바깥 클릭
        // ================================
        document.addEventListener('click', event => {

            if (
                notificationDropdown &&
                notificationBtn &&
                !notificationDropdown.contains(event.target) &&
                !notificationBtn.contains(event.target)
            ) {
                notificationDropdown.classList.remove('show');
            }


            if (
                profileDropdown &&
                profileBtn &&
                !profileDropdown.contains(event.target) &&
                !profileBtn.contains(event.target)
            ) {
                profileDropdown.classList.remove('show');
            }

        });


        // ================================
        // 검색
        // ================================
        if (searchBtn) {
            searchBtn.addEventListener(
                'click',
                performSearch
            );
        }


        if (searchNameInput) {

            searchNameInput.addEventListener(
                'keypress',
                event => {

                    if (event.key === 'Enter') {
                        performSearch();
                    }

                }
            );

        }


        function performSearch() {

            const searchTerm =
                searchNameInput
                    ? searchNameInput.value.trim().toLowerCase()
                    : '';

            const searchYear =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';

            const searchMonth =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filteredTrips = trips.filter(t => {

                const destination =
                    String(t.destination || '')
                        .toLowerCase();

                const startDate =
                    t.startDate || t.date || '';

                const date =
                    new Date(startDate);


                // 이름
                if (
                    searchTerm &&
                    !destination.includes(searchTerm)
                ) {
                    return false;
                }


                // 연도
                if (
                    searchYear &&
                    String(date.getFullYear()) !==
                    String(searchYear)
                ) {
                    return false;
                }


                // 월
                if (
                    searchMonth &&
                    String(date.getMonth() + 1) !==
                    String(searchMonth)
                ) {
                    return false;
                }


                return true;
            });


            renderTrips(filteredTrips);
        }


        // ================================
        // 여행 목록 출력
        // ================================
        function renderTrips(tripsToRender = trips) {

            if (!tripList) {
                return;
            }


            // 기존 카드 삭제
            tripList
                .querySelectorAll('.trip-card')
                .forEach(card => card.remove());


            const today = new Date();

            today.setHours(0, 0, 0, 0);


            let filteredTrips =
                tripsToRender.filter(t => {

                    const date =
                        new Date(
                            t.startDate || t.date
                        );

                    date.setHours(0, 0, 0, 0);


                    if (currentTab === 'upcoming') {
                        return date >= today;
                    }

                    return date < today;
                });


            // 날짜순 정렬
            filteredTrips.sort((a, b) => {

                return new Date(
                    a.startDate || a.date
                ) - new Date(
                    b.startDate || b.date
                );

            });


            // 지난 여행은 최신순
            if (currentTab === 'past') {
                filteredTrips.reverse();
            }


            // 없음
            if (filteredTrips.length === 0) {

                if (emptyState) {
                    emptyState.style.display = 'flex';
                }

                return;
            }


            if (emptyState) {
                emptyState.style.display = 'none';
            }


            // 카드 생성
            filteredTrips.forEach(t => {

                const card =
                    document.createElement('div');

                card.className = 'trip-card';


                card.innerHTML = `
                    <div class="trip-info">
                        <h3>${escapeHtml(t.destination)}</h3>
                        <p>${escapeHtml(t.startDate)} ~ ${escapeHtml(t.endDate)}</p>
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
                    card.querySelector('.delete-trip-btn');


                if (deleteBtn) {

                    deleteBtn.addEventListener(
                        'click',
                        event => {

                            event.stopPropagation();

                            deleteTrip(t.id);
                        }
                    );

                }


                // 카드 클릭
                card.addEventListener(
                    'click',
                    event => {

                        if (
                            event.target.closest(
                                '.delete-trip-btn'
                            )
                        ) {
                            return;
                        }


                        goToDetail(t.id);
                    }
                );


                tripList.appendChild(card);

            });

        }


        // ================================
        // 삭제
        // ================================
        window.deleteTrip = async function(id) {

            if (
                !confirm(
                    '정말 이 여행 일정을 삭제하시겠습니까?'
                )
            ) {
                return;
            }


            try {

                await db
                    .collection('trips')
                    .doc(String(id))
                    .delete();


                trips = trips.filter(
                    t => String(t.id) !== String(id)
                );


                renderTrips();
                updateStats();


                alert('여행 일정이 삭제되었습니다.');


            } catch (error) {

                console.error(
                    '여행 삭제 실패:',
                    error
                );

                alert(
                    '여행 일정 삭제에 실패했습니다.'
                );

            }

        };


        // ================================
        // 통계
        // ================================
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


        // ================================
        // 알림 출력
        // ================================
        function renderNotifications() {

            if (!notificationList) {
                return;
            }


            notificationList.innerHTML = '';


            const today = new Date();

            today.setHours(0, 0, 0, 0);


            const upcomingTrips =
                trips
                    .filter(t => {

                        const date =
                            new Date(
                                t.startDate || t.date
                            );

                        date.setHours(0, 0, 0, 0);

                        return date >= today;
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
                    new Date(
                        t.startDate || t.date
                    );

                start.setHours(0, 0, 0, 0);


                const diffTime =
                    start.getTime() -
                    today.getTime();


                const diffDays =
                    Math.ceil(
                        diffTime /
                        (1000 * 60 * 60 * 24)
                    );


                const dDayText =
                    diffDays === 0
                        ? 'D-Day'
                        : `D-${diffDays}`;


                const badgeClass =
                    diffDays === 0
                        ? 'd-day-today'
                        : 'd-day-upcoming';


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


                li.addEventListener(
                    'click',
                    () => {

                        goToDetail(t.id);

                        if (notificationDropdown) {
                            notificationDropdown
                                .classList
                                .remove('show');
                        }

                    }
                );


                notificationList.appendChild(li);

            });

        }


        // ================================
        // 캘린더
        // ================================
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


            // 앞쪽 빈칸
            for (let i = 0; i < startDay; i++) {

                const div =
                    document.createElement('div');

                div.className =
                    'calendar-day empty';

                grid.appendChild(div);
            }


            // 날짜
            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {

                const div =
                    document.createElement('div');

                div.className =
                    'calendar-day';


                const number =
                    document.createElement('span');

                number.textContent = day;

                div.appendChild(number);


                const dateStr =
                    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t => {

                        const start =
                            t.startDate || t.date || '';

                        const end =
                            t.endDate ||
                            t.startDate ||
                            t.date ||
                            '';


                        return (
                            dateStr >= start &&
                            dateStr <= end
                        );
                    });


                if (dayTrips.length > 0) {

                    div.classList.add(
                        'has-trip'
                    );


                    dayTrips.forEach(t => {

                        const label =
                            document.createElement('div');

                        label.className =
                            'trip-label';

                        label.textContent =
                            t.destination;

                        label.title =
                            t.destination;


                        label.addEventListener(
                            'click',
                            event => {

                                event.stopPropagation();

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


        if (!addBtn) {
            return;
        }


        addBtn.addEventListener(
            'click',
            async () => {

                const destination =
                    destinationInput
                        ? destinationInput.value.trim()
                        : '';

                const startDate =
                    startDateInput
                        ? startDateInput.value
                        : '';

                const endDate =
                    endDateInput
                        ? endDateInput.value
                        : '';

                const activity =
                    activityInput
                        ? activityInput.value.trim()
                        : '';


                // 필수값
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


                // 날짜 확인
                if (endDate < startDate) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;
                }


                const newTrip = {

                    id: Date.now(),

                    destination,

                    startDate,

                    endDate,

                    activity,

                    places: []
                };


                try {

                    await db
                        .collection('trips')
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

        await loadTrips();


        const urlParams =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            urlParams.get('id');


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


        const titleEl =
            document.getElementById('trip-title');

        const datesEl =
            document.getElementById('trip-dates');


        if (titleEl) {
            titleEl.textContent =
                trip.destination;
        }


        if (datesEl) {
            datesEl.textContent =
                `${trip.startDate} ~ ${trip.endDate}`;
        }


        // ================================
        // 지도
        // ================================
        const map =
            L.map('map').setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap'
            }
        ).addTo(map);


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


        if (!trip.places) {
            trip.places = [];
        }


        renderPlaces();


        // ================================
        // 장소 추가
        // ================================
        if (addPlaceBtn) {

            addPlaceBtn.addEventListener(
                'click',
                async () => {

                    const placeName =
                        placeInput
                            ? placeInput.value.trim()
                            : '';


                    if (!placeName) {
                        return;
                    }


                    try {

                        const response =
                            await fetch(
                                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(placeName)}`,
                                {
                                    headers: {
                                        'Accept-Language': 'ko'
                                    }
                                }
                            );


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

                            name: placeName,

                            lat:
                                parseFloat(
                                    result.lat
                                ),

                            lng:
                                parseFloat(
                                    result.lon
                                ),

                            isLocked: false
                        };


                        trip.places.push(
                            newPlace
                        );


                        await saveCurrentTrip();


                        renderPlaces();


                        if (placeInput) {
                            placeInput.value = '';
                        }


                    } catch (error) {

                        console.error(
                            '장소 검색 오류:',
                            error
                        );


                        alert(
                            '장소 검색 중 오류가 발생했습니다.'
                        );

                    }

                }
            );

        }


        // ================================
        // 최적화
        // ================================
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


            const places =
                [...trip.places];


            const lockedPlaces = [];
            const unlockedPlaces = [];


            places.forEach(
                (place, index) => {

                    if (place.isLocked) {

                        lockedPlaces.push({
                            place,
                            index
                        });

                    } else {

                        unlockedPlaces.push(
                            place
                        );

                    }

                }
            );


            if (unlockedPlaces.length < 2) {

                alert(
                    '최적화할 수 있는 장소가 2개 이상 필요합니다.'
                );

                return;
            }


            const originalOrder =
                JSON.stringify(
                    places.map(p => p.id)
                );


            // --------------------------------
            // 잠금 위치 유지
            // --------------------------------
            function reconstructRoute(
                unlocked
            ) {

                const result =
                    new Array(
                        places.length
                    ).fill(null);


                lockedPlaces.forEach(
                    item => {

                        result[item.index] =
                            item.place;

                    }
                );


                let index = 0;


                for (
                    let i = 0;
                    i < result.length;
                    i++
                ) {

                    if (result[i] === null) {

                        result[i] =
                            unlocked[index++];

                    }

                }


                return result;
            }


            // --------------------------------
            // 거리 계산
            // --------------------------------
            function calculateDistance(
                route
            ) {

                let distance = 0;


                for (
                    let i = 0;
                    i < route.length - 1;
                    i++
                ) {

                    const a =
                        L.latLng(
                            route[i].lat,
                            route[i].lng
                        );


                    const b =
                        L.latLng(
                            route[i + 1].lat,
                            route[i + 1].lng
                        );


                    distance +=
                        a.distanceTo(b);

                }


                return distance;
            }


            let currentSolution =
                [...unlockedPlaces];


            let currentRoute =
                reconstructRoute(
                    currentSolution
                );


            let currentDistance =
                calculateDistance(
                    currentRoute
                );


            let bestSolution =
                [...currentSolution];


            let bestDistance =
                currentDistance;


            let temperature = 10000;


            // --------------------------------
            // Simulated Annealing
            // --------------------------------
            for (
                let i = 0;
                i < 2500;
                i++
            ) {

                const newSolution =
                    [...currentSolution];


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


                if (
                    Math.random() < 0.5 &&
                    newSolution.length > 2
                ) {

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

                    [
                        newSolution[idx1],
                        newSolution[idx2]
                    ] =
                    [
                        newSolution[idx2],
                        newSolution[idx1]
                    ];

                }


                const newRoute =
                    reconstructRoute(
                        newSolution
                    );


                const newDistance =
                    calculateDistance(
                        newRoute
                    );


                const probability =
                    Math.exp(
                        (
                            currentDistance -
                            newDistance
                        ) / temperature
                    );


                if (
                    newDistance <
                    currentDistance ||
                    Math.random() <
                    probability
                ) {

                    currentSolution =
                        newSolution;

                    currentDistance =
                        newDistance;


                    if (
                        newDistance <
                        bestDistance
                    ) {

                        bestSolution =
                            [...newSolution];

                        bestDistance =
                            newDistance;
                    }

                }


                temperature *= 0.995;


                if (
                    temperature < 0.001
                ) {
                    temperature = 0.001;
                }

            }


            trip.places =
                reconstructRoute(
                    bestSolution
                );


            await saveCurrentTrip();


            renderPlaces();


            const newOrder =
                JSON.stringify(
                    trip.places.map(
                        p => p.id
                    )
                );


            const distanceKm =
                (
                    bestDistance / 1000
                ).toFixed(1);


            if (
                originalOrder ===
                newOrder
            ) {

                alert(
                    `이미 최적의 경로입니다! (총 거리: ${distanceKm}km)`
                );

            } else {

                alert(
                    `경로를 최적화했습니다! (총 거리: ${distanceKm}km)`
                );

            }

        }


        // =====================================================
        // 잠금
        // =====================================================
        window.toggleLock =
            async function(id) {

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


                await saveCurrentTrip();


                renderPlaces();
            };


        // =====================================================
        // 장소 삭제
        // =====================================================
        window.removePlace =
            async function(id) {

                trip.places =
                    trip.places.filter(
                        p =>
                            String(p.id) !==
                            String(id)
                    );


                await saveCurrentTrip();


                renderPlaces();
            };


        // =====================================================
        // 장소 렌더링
        // =====================================================
        function renderPlaces() {

            if (!placesList) {
                return;
            }


            placesList.innerHTML = '';


            // 기존 지도 마커/선 제거
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
                    '<div class="empty-places"><p>방문할 장소를 추가해보세요!</p></div>';

                return;
            }


            const latlngs = [];


            trip.places.forEach(
                (place, index) => {

                    const item =
                        document.createElement('div');


                    item.className =
                        `place-item ${place.isLocked ? 'locked' : ''}`;


                    item.dataset.id =
                        String(place.id);


                    item.draggable =
                        !place.isLocked;


                    item.innerHTML = `

                        <span class="place-number">
                            ${index + 1}
                        </span>

                        <span class="place-name">
                            ${escapeHtml(place.name)}
                        </span>

                        <button
                            class="lock-btn ${place.isLocked ? 'active' : ''}"
                            type="button"
                        >
                            <i class="fa-solid ${place.isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
                        </button>

                        <button
                            class="remove-place-btn"
                            type="button"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    `;


                    // 잠금
                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    if (lockBtn) {

                        lockBtn.addEventListener(
                            'click',
                            event => {

                                event.stopPropagation();

                                window.toggleLock(
                                    place.id
                                );
                            }
                        );

                    }


                    // 삭제
                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    if (removeBtn) {

                        removeBtn.addEventListener(
                            'click',
                            event => {

                                event.stopPropagation();

                                window.removePlace(
                                    place.id
                                );
                            }
                        );

                    }


                    // 드래그
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


                                await updateOrderFromDOM();
                            }
                        );

                    }


                    placesList.appendChild(item);


                    // 마커
                    L.marker(
                        [
                            place.lat,
                            place.lng
                        ]
                    )
                        .addTo(map)
                        .bindPopup(
                            `${index + 1}. ${escapeHtml(place.name)}`
                        );


                    latlngs.push(
                        [
                            place.lat,
                            place.lng
                        ]
                    );

                }
            );


            // 경로
            if (latlngs.length > 1) {

                L.polyline(
                    latlngs,
                    {
                        color: 'blue'
                    }
                ).addTo(map);


                map.fitBounds(
                    latlngs,
                    {
                        padding: [30, 30]
                    }
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


        // =====================================================
        // 드래그 정렬
        // =====================================================
        if (placesList) {

            placesList.addEventListener(
                'dragover',
                event => {

                    event.preventDefault();


                    const dragging =
                        placesList.querySelector(
                            '.dragging'
                        );


                    if (!dragging) {
                        return;
                    }


                    const afterElement =
                        getDragAfterElement(
                            placesList,
                            event.clientY
                        );


                    if (
                        afterElement === null
                    ) {

                        placesList.appendChild(
                            dragging
                        );

                    } else {

                        placesList.insertBefore(
                            dragging,
                            afterElement
                        );

                    }

                }
            );

        }


        function getDragAfterElement(
            container,
            y
        ) {

            const elements =
                [
                    ...container.querySelectorAll(
                        '.place-item:not(.dragging):not(.locked)'
                    )
                ];


            let closest = {
                offset:
                    Number.NEGATIVE_INFINITY,
                element:
                    null
            };


            elements.forEach(
                child => {

                    const box =
                        child.getBoundingClientRect();


                    const offset =
                        y -
                        box.top -
                        box.height / 2;


                    if (
                        offset < 0 &&
                        offset >
                        closest.offset
                    ) {

                        closest = {
                            offset,
                            element: child
                        };

                    }

                }
            );


            return closest.element;

        }


        // =====================================================
        // DOM → places 배열
        // =====================================================
        async function updateOrderFromDOM() {

            if (!placesList) {
                return;
            }


            const domItems =
                [
                    ...placesList.querySelectorAll(
                        '.place-item'
                    )
                ];


            const placeMap =
                new Map(
                    trip.places.map(
                        p => [
                            String(p.id),
                            p
                        ]
                    )
                );


            const newOrder =
                [];


            domItems.forEach(item => {

                const id =
                    item.dataset.id;


                const place =
                    placeMap.get(
                        String(id)
                    );


                if (place) {
                    newOrder.push(place);
                }

            });


            if (
                newOrder.length !==
                trip.places.length
            ) {
                return;
            }


            trip.places =
                newOrder;


            await saveCurrentTrip();


            renderPlaces();

        }


        // =====================================================
        // 현재 여행 저장
        // =====================================================
        async function saveCurrentTrip() {

            if (!trip) {
                return;
            }


            try {

                await db
                    .collection('trips')
                    .doc(String(trip.id))
                    .set(
                        {
                            id: trip.id,
                            destination:
                                trip.destination,
                            startDate:
                                trip.startDate,
                            endDate:
                                trip.endDate,
                            activity:
                                trip.activity || '',
                            places:
                                trip.places || []
                        },
                        {
                            merge: true
                        }
                    );


                // 메모리 trips도 갱신
                const index =
                    trips.findIndex(
                        t =>
                            String(t.id) ===
                            String(trip.id)
                    );


                if (index !== -1) {

                    trips[index] = {
                        ...trip
                    };

                }


                console.log(
                    '현재 여행 저장 완료'
                );


            } catch (error) {

                console.error(
                    '현재 여행 저장 실패:',
                    error
                );


                alert(
                    '여행 정보 저장에 실패했습니다.'
                );

            }

        }

    }


    // =========================================================
    // Firestore에서 여행 목록 불러오기
    // =========================================================
    async function loadTrips() {

        try {

            const snapshot =
                await db
                    .collection('trips')
                    .get();


            trips =
                snapshot.docs.map(doc => {

                    const data =
                        doc.data();


                    console.log(
                        'Firestore 문서:',
                        doc.id,
                        data
                    );


                    return {

                        // 중요:
                        // Firestore 문서 ID는 문자열
                        id: String(doc.id),

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

                });


            console.log(
                '최종 trips:',
                trips
            );


            return trips;


        } catch (error) {

            console.error(
                'Firestore에서 일정 불러오기 실패:',
                error
            );


            alert(
                '여행 일정을 불러오지 못했습니다.'
            );


            trips = [];


            return trips;
        }

    }


    // =========================================================
    // 여행 전체 저장
    // =========================================================
    async function saveTrips() {

        try {

            const batch =
                db.batch();


            trips.forEach(t => {

                const docRef =
                    db
                        .collection('trips')
                        .doc(String(t.id));


                batch.set(
                    docRef,
                    {
                        id: t.id,
                        destination:
                            t.destination,
                        startDate:
                            t.startDate,
                        endDate:
                            t.endDate,
                        activity:
                            t.activity || '',
                        places:
                            t.places || []
                    },
                    {
                        merge: true
                    }
                );

            });


            await batch.commit();


            console.log(
                'Firestore 저장 완료'
            );


        } catch (error) {

            console.error(
                'Firestore 저장 실패:',
                error
            );


            alert(
                '여행 일정 저장에 실패했습니다.'
            );

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


        window.location.href =
            `trip_detail.html?id=${encodeURIComponent(String(id))}`;

    }


    // =========================================================
    // HTML 문자 처리
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
