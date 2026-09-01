document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 중복 실행 방지
    // =========================================================

    // script.js가 HTML에 실수로 여러 번 들어가 있어도
    // 같은 페이지에서 초기화가 여러 번 실행되지 않도록 방지
    if (window.travelPlannerInitialized) {
        console.warn('Travel Planner script가 이미 실행되었습니다.');
        return;
    }

    window.travelPlannerInitialized = true;


    // =========================================================
    // Firebase 확인
    // =========================================================

    if (typeof firebase === 'undefined') {
        console.error('Firebase가 로드되지 않았습니다.');
        alert('Firebase 연결을 확인해주세요.');
        return;
    }

    if (typeof db === 'undefined') {
        console.error('Firebase db가 없습니다.');
        alert('Firebase 연결을 확인해주세요.');
        return;
    }


    // =========================================================
    // 공통 상태
    // =========================================================

    let trips = [];
    let currentTab = 'upcoming';
    let currentView = 'list';
    let currentCalendarDate = new Date();
    let currentTrip = null;


    // =========================================================
    // 페이지 확인
    // =========================================================

    const isDetailPage =
        document.getElementById('map') &&
        document.getElementById('places-list');

    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    console.log('페이지 확인:', {
        isDetailPage,
        isAddPage,
        isIndexPage
    });


    // =========================================================
    // 페이지 실행
    // =========================================================

    if (isDetailPage) {
        initDetailPage();
    }
    else if (isAddPage) {
        initAddPage();
    }
    else if (isIndexPage) {
        initIndexPage();
    }


    // =========================================================
    // Firestore에서 여행 전체 불러오기
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


                    return {

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
                            Array.isArray(data.places)
                                ? data.places
                                : []

                    };

                });


            console.log(
                'Firestore 여행 데이터:',
                trips
            );


            return trips;

        }
        catch (error) {

            console.error(
                'Firestore 불러오기 실패:',
                error
            );


            alert(
                'Firestore에서 여행 정보를 불러오지 못했습니다.'
            );


            trips = [];


            return [];

        }

    }


    // =========================================================
    // 여행 하나 저장
    // =========================================================

    async function saveTrip(trip) {

        if (!trip) {

            console.error(
                '저장할 여행이 없습니다.'
            );

            return false;

        }


        try {

            const id =
                String(trip.id);


            await db
                .collection('trips')
                .doc(id)
                .set({

                    id:
                        trip.id,

                    destination:
                        trip.destination || '',

                    startDate:
                        trip.startDate || '',

                    endDate:
                        trip.endDate || '',

                    activity:
                        trip.activity || '',

                    places:
                        Array.isArray(trip.places)
                            ? trip.places
                            : []

                }, {

                    merge: true

                });


            console.log(
                '여행 저장 완료:',
                id
            );


            return true;

        }
        catch (error) {

            console.error(
                '여행 저장 실패:',
                error
            );


            alert(
                '여행 저장에 실패했습니다.'
            );


            return false;

        }

    }


    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList =
            document.getElementById(
                'trip-list'
            );

        const calendarView =
            document.getElementById(
                'calendar-view'
            );

        const emptyState =
            document.getElementById(
                'empty-state'
            );

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

        const tabBtns =
            document.querySelectorAll(
                '.tab-btn'
            );

        const viewBtns =
            document.querySelectorAll(
                '.view-btn'
            );


        // =====================================================
        // 검색
        // =====================================================

        const searchNameInput =
            document.getElementById(
                'search-name'
            );

        const searchYearSelect =
            document.getElementById(
                'search-year'
            );

        const searchMonthSelect =
            document.getElementById(
                'search-month'
            );

        const searchBtn =
            document.getElementById(
                'search-btn'
            );


        // =====================================================
        // 연도
        // =====================================================

        if (
            searchYearSelect &&
            searchYearSelect.dataset.initialized !== 'true'
        ) {

            searchYearSelect.dataset.initialized =
                'true';


            const currentYear =
                new Date().getFullYear();


            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    year;


                option.textContent =
                    `${year}년`;


                searchYearSelect.appendChild(
                    option
                );

            }

        }


        // =====================================================
        // 초기 로딩
        // =====================================================

        loadTrips().then(() => {

            renderTrips();

            updateStats();

        });


        // =====================================================
        // 탭
        // =====================================================

        tabBtns.forEach(btn => {

            if (
                btn.dataset.listenerAdded === 'true'
            ) {
                return;
            }


            btn.dataset.listenerAdded =
                'true';


            btn.addEventListener(
                'click',
                () => {

                    tabBtns.forEach(b =>
                        b.classList.remove(
                            'active'
                        )
                    );


                    btn.classList.add(
                        'active'
                    );


                    currentTab =
                        btn.dataset.tab;


                    renderTrips();

                }
            );

        });


        // =====================================================
        // 보기 방식
        // =====================================================

        viewBtns.forEach(btn => {

            if (
                btn.dataset.listenerAdded === 'true'
            ) {
                return;
            }


            btn.dataset.listenerAdded =
                'true';


            btn.addEventListener(
                'click',
                () => {

                    const title =
                        btn.getAttribute(
                            'title'
                        ) || '';


                    if (
                        title.includes('리스트')
                    ) {

                        currentView =
                            'list';


                        if (tripList) {

                            tripList.style.display =
                                'flex';

                        }


                        if (calendarView) {

                            calendarView.style.display =
                                'none';

                        }


                        if (viewBtns[0]) {

                            viewBtns[0].classList.add(
                                'active'
                            );

                        }


                        if (viewBtns[1]) {

                            viewBtns[1].classList.remove(
                                'active'
                            );

                        }


                        renderTrips();

                    }
                    else {

                        currentView =
                            'calendar';


                        if (tripList) {

                            tripList.style.display =
                                'none';

                        }


                        if (calendarView) {

                            calendarView.style.display =
                                'flex';

                        }


                        if (viewBtns[0]) {

                            viewBtns[0].classList.remove(
                                'active'
                            );

                        }


                        if (viewBtns[1]) {

                            viewBtns[1].classList.add(
                                'active'
                            );

                        }


                        renderCalendar();

                    }

                }
            );

        });


        // =====================================================
        // 검색 버튼
        // =====================================================

        if (
            searchBtn &&
            searchBtn.dataset.listenerAdded !== 'true'
        ) {

            searchBtn.dataset.listenerAdded =
                'true';


            searchBtn.addEventListener(
                'click',
                performSearch
            );

        }


        // =====================================================
        // 검색 Enter
        // =====================================================

        if (
            searchNameInput &&
            searchNameInput.dataset.listenerAdded !== 'true'
        ) {

            searchNameInput.dataset.listenerAdded =
                'true';


            searchNameInput.addEventListener(
                'keypress',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        performSearch();

                    }

                }
            );

        }


        // =====================================================
        // 검색 실행
        // =====================================================

        function performSearch() {

            const term =
                searchNameInput
                    ? searchNameInput.value
                        .trim()
                        .toLowerCase()
                    : '';


            const year =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';


            const month =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filtered =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate
                        );


                    const nameMatch =
                        (t.destination || '')
                            .toLowerCase()
                            .includes(term);


                    const yearMatch =
                        !year ||
                        String(
                            date.getFullYear()
                        ) === String(year);


                    const monthMatch =
                        !month ||
                        String(
                            date.getMonth() + 1
                        ) === String(month);


                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filtered);

        }


        // =====================================================
        // 여행 카드
        // =====================================================

        function renderTrips(
            tripsToRender = trips
        ) {

            if (!tripList) {
                return;
            }


            tripList
                .querySelectorAll(
                    '.trip-card'
                )
                .forEach(card =>
                    card.remove()
                );


            const today =
                new Date();


            today.setHours(
                0,
                0,
                0,
                0
            );


            let filtered =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate
                        );


                    start.setHours(
                        0,
                        0,
                        0,
                        0
                    );


                    if (
                        currentTab === 'upcoming'
                    ) {

                        return start >= today;

                    }


                    return start < today;

                });


            filtered.sort(
                (a, b) =>
                    new Date(a.startDate) -
                    new Date(b.startDate)
            );


            if (
                currentTab === 'past'
            ) {

                filtered.reverse();

            }


            if (
                filtered.length === 0
            ) {

                if (emptyState) {

                    emptyState.style.display =
                        'flex';

                }


                return;

            }


            if (emptyState) {

                emptyState.style.display =
                    'none';

            }


            filtered.forEach(t => {

                const card =
                    document.createElement(
                        'div'
                    );


                card.className =
                    'trip-card';


                card.innerHTML = `

                    <div class="trip-info">

                        <h3>
                            ${escapeHtml(
                                t.destination
                            )}
                        </h3>

                        <p>
                            ${escapeHtml(
                                t.startDate
                            )}
                            ~
                            ${escapeHtml(
                                t.endDate
                            )}
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


                if (deleteBtn) {

                    deleteBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();


                            await deleteTrip(
                                t.id
                            );

                        }
                    );

                }


                card.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `trip_detail.html?id=${encodeURIComponent(
                                String(t.id)
                            )}`;

                    }
                );


                tripList.appendChild(
                    card
                );

            });

        }


        // =====================================================
        // 삭제
        // =====================================================

        async function deleteTrip(id) {

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


                trips =
                    trips.filter(
                        t =>
                            String(t.id) !==
                            String(id)
                    );


                renderTrips();

                updateStats();

            }
            catch (error) {

                console.error(
                    '삭제 실패:',
                    error
                );


                alert(
                    '여행 삭제에 실패했습니다.'
                );

            }

        }


        // =====================================================
        // 통계
        // =====================================================

        function updateStats() {

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
                            t.startDate
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
                            t.startDate
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


        // =====================================================
        // 캘린더
        // =====================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );


            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid) {
                return;
            }


            grid.innerHTML =
                '';


            const year =
                currentCalendarDate.getFullYear();


            const month =
                currentCalendarDate.getMonth();


            if (monthDisplay) {

                monthDisplay.textContent =
                    `${year}년 ${month + 1}월`;

            }


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            const daysInMonth =
                lastDay.getDate();


            const startDay =
                firstDay.getDay();


            for (
                let i = 0;
                i < startDay;
                i++
            ) {

                const empty =
                    document.createElement(
                        'div'
                    );


                empty.className =
                    'calendar-day empty';


                grid.appendChild(
                    empty
                );

            }


            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {

                const div =
                    document.createElement(
                        'div'
                    );


                div.className =
                    'calendar-day';


                const number =
                    document.createElement(
                        'span'
                    );


                number.textContent =
                    day;


                div.appendChild(
                    number
                );


                const dateStr =
                    `${year}-${String(
                        month + 1
                    ).padStart(2, '0')}-${String(
                        day
                    ).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t =>
                        dateStr >= t.startDate &&
                        dateStr <= t.endDate
                    );


                dayTrips.forEach(t => {

                    const label =
                        document.createElement(
                            'div'
                        );


                    label.className =
                        'trip-label';


                    label.textContent =
                        t.destination;


                    div.appendChild(
                        label
                    );

                });


                grid.appendChild(
                    div
                );

            }

        }


        const prev =
            document.getElementById(
                'prev-month'
            );


        const next =
            document.getElementById(
                'next-month'
            );


        if (
            prev &&
            prev.dataset.listenerAdded !== 'true'
        ) {

            prev.dataset.listenerAdded =
                'true';


            prev.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1
                    );


                    renderCalendar();

                }
            );

        }


        if (
            next &&
            next.dataset.listenerAdded !== 'true'
        ) {

            next.dataset.listenerAdded =
                'true';


            next.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1
                    );


                    renderCalendar();

                }
            );

        }

    }


    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById(
                'add-btn'
            );


        if (!addBtn) {
            return;
        }


        // -----------------------------------------------------
        // ★ 이미 이벤트가 등록되어 있으면 다시 등록하지 않음
        // -----------------------------------------------------

        if (
            addBtn.dataset.listenerAdded === 'true'
        ) {

            console.warn(
                '일정 추가 버튼 이벤트가 이미 등록되어 있습니다.'
            );

            return;

        }


        addBtn.dataset.listenerAdded =
            'true';


        const destination =
            document.getElementById(
                'destination'
            );


        const startDate =
            document.getElementById(
                'start-date'
            );


        const endDate =
            document.getElementById(
                'end-date'
            );


        const activity =
            document.getElementById(
                'activity'
            );


        // -----------------------------------------------------
        // ★ 중복 저장 방지용 상태
        // -----------------------------------------------------

        let isSaving =
            false;


        // -----------------------------------------------------
        // 일정 추가
        // -----------------------------------------------------

        addBtn.addEventListener(
            'click',
            async () => {

                // 이미 저장 중이면 아무것도 하지 않음
                if (isSaving) {

                    console.warn(
                        '이미 일정 저장 중입니다.'
                    );

                    return;

                }


                const destinationValue =
                    destination
                        ? destination.value.trim()
                        : '';


                const startValue =
                    startDate
                        ? startDate.value
                        : '';


                const endValue =
                    endDate
                        ? endDate.value
                        : '';


                const activityValue =
                    activity
                        ? activity.value.trim()
                        : '';


                // -------------------------------------------------
                // 필수값 확인
                // -------------------------------------------------

                if (
                    !destinationValue ||
                    !startValue ||
                    !endValue
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;

                }


                // -------------------------------------------------
                // 날짜 확인
                // -------------------------------------------------

                if (
                    endValue < startValue
                ) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;

                }


                // -------------------------------------------------
                // ★ 저장 시작
                // -------------------------------------------------

                isSaving =
                    true;


                addBtn.disabled =
                    true;


                const originalText =
                    addBtn.innerHTML;


                addBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    저장 중...
                `;


                try {

                    // -------------------------------------------------
                    // ID 생성
                    // -------------------------------------------------

                    const id =
                        String(
                            Date.now()
                        );


                    const newTrip = {

                        id,

                        destination:
                            destinationValue,

                        startDate:
                            startValue,

                        endDate:
                            endValue,

                        activity:
                            activityValue,

                        places:
                            []

                    };


                    console.log(
                        '새 여행 저장 시작:',
                        newTrip
                    );


                    // -------------------------------------------------
                    // ★ Firestore 한 번만 저장
                    // -------------------------------------------------

                    const success =
                        await saveTrip(
                            newTrip
                        );


                    if (success) {

                        console.log(
                            '새 여행 저장 성공:',
                            id
                        );


                        // 저장 성공 후에만 이동
                        window.location.href =
                            'index.html';


                        return;

                    }


                    // 저장 실패
                    isSaving =
                        false;


                    addBtn.disabled =
                        false;


                    addBtn.innerHTML =
                        originalText;

                }
                catch (error) {

                    console.error(
                        '일정 추가 실패:',
                        error
                    );


                    alert(
                        '일정을 추가하는 중 오류가 발생했습니다.'
                    );


                    isSaving =
                        false;


                    addBtn.disabled =
                        false;


                    addBtn.innerHTML =
                        originalText;

                }

            }
        );


        // =====================================================
        // Enter로 일정 추가
        // =====================================================

        const formInputs = [
            destination,
            startDate,
            endDate,
            activity
        ];


        formInputs.forEach(input => {

            if (!input) {
                return;
            }


            if (
                input.dataset.listenerAdded === 'true'
            ) {

                return;

            }


            input.dataset.listenerAdded =
                'true';


            input.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();


                        // 버튼의 click 이벤트 하나만 실행
                        if (!isSaving) {

                            addBtn.click();

                        }

                    }

                }
            );

        });

    }


    // =========================================================
    // DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        console.log(
            '===== 상세 페이지 시작 ====='
        );


        // =====================================================
        // Leaflet 확인
        // =====================================================

        if (
            typeof L === 'undefined'
        ) {

            console.error(
                'Leaflet이 로드되지 않았습니다.'
            );


            alert(
                '지도 라이브러리를 불러오지 못했습니다.'
            );


            return;

        }


        // =====================================================
        // URL ID
        // =====================================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            params.get('id');


        console.log(
            'URL 여행 ID:',
            tripId
        );


        if (!tripId) {

            alert(
                '여행 ID가 없습니다.'
            );


            window.location.href =
                'index.html';


            return;

        }


        // =====================================================
        // Firestore에서 여행 하나 조회
        // =====================================================

        try {

            const doc =
                await db
                    .collection('trips')
                    .doc(String(tripId))
                    .get();


            if (!doc.exists) {

                console.error(
                    '여행 문서 없음:',
                    tripId
                );


                alert(
                    '여행 정보를 찾을 수 없습니다.'
                );


                window.location.href =
                    'index.html';


                return;

            }


            const data =
                doc.data();


            currentTrip = {

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
                    Array.isArray(data.places)
                        ? data.places
                        : []

            };


            console.log(
                '상세 여행 데이터:',
                currentTrip
            );

        }
        catch (error) {

            console.error(
                '여행 조회 실패:',
                error
            );


            alert(
                '여행 정보를 불러오지 못했습니다.'
            );


            return;

        }


        // =====================================================
        // HTML 요소
        // =====================================================

        const title =
            document.getElementById(
                'trip-title'
            );


        const dates =
            document.getElementById(
                'trip-dates'
            );


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


        const mapElement =
            document.getElementById(
                'map'
            );


        // =====================================================
        // 제목 / 날짜
        // =====================================================

        if (title) {

            title.textContent =
                currentTrip.destination;

        }


        if (dates) {

            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

        }


        // =====================================================
        // 지도
        // =====================================================

        if (!mapElement) {

            console.error(
                '#map 요소가 없습니다.'
            );


            alert(
                '지도 영역을 찾을 수 없습니다.'
            );


            return;

        }


        const map =
            L.map(
                mapElement
            ).setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {

                maxZoom:
                    19,

                attribution:
                    '&copy; OpenStreetMap contributors'

            }
        ).addTo(
            map
        );


        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );


        // =====================================================
        // 장소 렌더링
        // =====================================================

        function renderPlaces() {

            if (!placesList) {
                return;
            }


            placesList.innerHTML =
                '';


            map.eachLayer(
                layer => {

                    if (
                        layer instanceof L.Marker ||
                        layer instanceof L.Polyline
                    ) {

                        map.removeLayer(
                            layer
                        );

                    }

                }
            );


            if (
                !currentTrip.places ||
                currentTrip.places.length === 0
            ) {

                placesList.innerHTML = `

                    <div class="empty-places">

                        <p>
                            방문할 장소를 추가해보세요!
                        </p>

                    </div>

                `;


                return;

            }


            const latlngs =
                [];


            currentTrip.places.forEach(
                (place, index) => {

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'place-item' +
                        (
                            place.isLocked
                                ? ' locked'
                                : ''
                        );


                    item.dataset.id =
                        String(
                            place.id
                        );


                    item.draggable =
                        !place.isLocked;


                    item.innerHTML = `

                        <span class="place-number">
                            ${index + 1}
                        </span>

                        <span class="place-name">
                            ${escapeHtml(
                                place.name
                            )}
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


                    // =================================================
                    // 잠금
                    // =================================================

                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    if (lockBtn) {

                        lockBtn.addEventListener(
                            'click',
                            async e => {

                                e.stopPropagation();


                                place.isLocked =
                                    !place.isLocked;


                                await saveCurrentTrip();


                                renderPlaces();

                            }
                        );

                    }


                    // =================================================
                    // 삭제
                    // =================================================

                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    if (removeBtn) {

                        removeBtn.addEventListener(
                            'click',
                            async e => {

                                e.stopPropagation();


                                if (
                                    !confirm(
                                        `"${place.name}" 장소를 삭제할까요?`
                                    )
                                ) {

                                    return;

                                }


                                currentTrip.places =
                                    currentTrip.places.filter(
                                        p =>
                                            String(p.id) !==
                                            String(place.id)
                                    );


                                await saveCurrentTrip();


                                renderPlaces();

                            }
                        );

                    }


                    // =================================================
                    // 드래그
                    // =================================================

                    if (
                        !place.isLocked
                    ) {

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


                    // =================================================
                    // 지도 마커
                    // =================================================

                    const lat =
                        Number(
                            place.lat
                        );


                    const lng =
                        Number(
                            place.lng
                        );


                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                    ) {

                        L.marker(
                            [lat, lng]
                        )
                            .addTo(map)
                            .bindPopup(
                                `${index + 1}. ${escapeHtml(
                                    place.name
                                )}`
                            );


                        latlngs.push(
                            [lat, lng]
                        );

                    }

                }
            );


            // =====================================================
            // 경로
            // =====================================================

            if (
                latlngs.length > 1
            ) {

                L.polyline(
                    latlngs
                ).addTo(
                    map
                );


                map.fitBounds(
                    latlngs,
                    {
                        padding: [
                            40,
                            40
                        ]
                    }
                );

            }
            else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    14
                );

            }

        }


        // =====================================================
        // 현재 여행 저장
        // =====================================================

        async function saveCurrentTrip() {

            return await saveTrip(
                currentTrip
            );

        }


        // =====================================================
        // 장소 추가
        // =====================================================

        let isAddingPlace =
            false;


        async function addPlace() {

            if (isAddingPlace) {
                return;
            }


            if (!placeInput) {
                return;
            }


            const name =
                placeInput.value.trim();


            if (!name) {

                alert(
                    '장소를 입력해주세요.'
                );


                return;

            }


            isAddingPlace =
                true;


            if (addPlaceBtn) {

                addPlaceBtn.disabled =
                    true;

            }


            try {

                const url =
                    'https://nominatim.openstreetmap.org/search' +
                    '?format=json' +
                    '&limit=1' +
                    '&q=' +
                    encodeURIComponent(name);


                const response =
                    await fetch(
                        url,
                        {

                            headers: {

                                Accept:
                                    'application/json'

                            }

                        }
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

                    id:
                        String(
                            Date.now()
                        ),

                    name,

                    lat:
                        Number(
                            result.lat
                        ),

                    lng:
                        Number(
                            result.lon
                        ),

                    isLocked:
                        false

                };


                currentTrip.places.push(
                    newPlace
                );


                const success =
                    await saveCurrentTrip();


                if (!success) {

                    currentTrip.places.pop();


                    return;

                }


                placeInput.value =
                    '';


                renderPlaces();

            }
            catch (error) {

                console.error(
                    '장소 추가 오류:',
                    error
                );


                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            }
            finally {

                isAddingPlace =
                    false;


                if (addPlaceBtn) {

                    addPlaceBtn.disabled =
                        false;

                }

            }

        }


        // =====================================================
        // 장소 추가 버튼
        // =====================================================

        if (
            addPlaceBtn &&
            addPlaceBtn.dataset.listenerAdded !== 'true'
        ) {

            addPlaceBtn.dataset.listenerAdded =
                'true';


            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        // =====================================================
        // 장소 Enter
        // =====================================================

        if (
            placeInput &&
            placeInput.dataset.listenerAdded !== 'true'
        ) {

            placeInput.dataset.listenerAdded =
                'true';


            placeInput.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();


                        addPlace();

                    }

                }
            );

        }


        // =====================================================
        // 드래그 정렬
        // =====================================================

        if (
            placesList &&
            placesList.dataset.listenerAdded !== 'true'
        ) {

            placesList.dataset.listenerAdded =
                'true';


            placesList.addEventListener(
                'dragover',
                e => {

                    e.preventDefault();


                    const dragging =
                        placesList.querySelector(
                            '.dragging'
                        );


                    if (!dragging) {
                        return;
                    }


                    const after =
                        getDragAfterElement(
                            placesList,
                            e.clientY
                        );


                    if (!after) {

                        placesList.appendChild(
                            dragging
                        );

                    }
                    else {

                        placesList.insertBefore(
                            dragging,
                            after
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
                        '.place-item:not(.dragging)'
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
                        offset > closest.offset
                    ) {

                        closest = {

                            offset,

                            element:
                                child

                        };

                    }

                }
            );


            return closest.element;

        }


        // =====================================================
        // 순서 업데이트
        // =====================================================

        async function updateOrder() {

            if (!placesList) {
                return;
            }


            const items =
                placesList.querySelectorAll(
                    '.place-item'
                );


            const ids =
                [...items].map(
                    item =>
                        String(
                            item.dataset.id
                        )
                );


            const reordered =
                [];


            ids.forEach(id => {

                const found =
                    currentTrip.places.find(
                        p =>
                            String(p.id) ===
                            id
                    );


                if (found) {

                    reordered.push(
                        found
                    );

                }

            });


            if (
                reordered.length ===
                currentTrip.places.length
            ) {

                currentTrip.places =
                    reordered;


                await saveCurrentTrip();


                renderPlaces();

            }

        }


        // =====================================================
        // 경로 최적화
        // =====================================================

        if (
            optimizeBtn &&
            optimizeBtn.dataset.listenerAdded !== 'true'
        ) {

            optimizeBtn.dataset.listenerAdded =
                'true';


            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        let isOptimizing =
            false;


        async function optimizeRoute() {

            if (isOptimizing) {
                return;
            }


            const places =
                currentTrip.places;


            if (
                !places ||
                places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );


                return;

            }


            const unlocked =
                places.filter(
                    p =>
                        !p.isLocked
                );


            if (
                unlocked.length < 2
            ) {

                alert(
                    '잠금 해제된 장소가 2개 이상 필요합니다.'
                );


                return;

            }


            isOptimizing =
                true;


            if (optimizeBtn) {

                optimizeBtn.disabled =
                    true;

            }


            try {

                const unlockedCopy =
                    [...unlocked];


                const result =
                    [];


                let current =
                    unlockedCopy.shift();


                result.push(
                    current
                );


                while (
                    unlockedCopy.length > 0
                ) {

                    let nearestIndex =
                        0;


                    let nearestDistance =
                        Infinity;


                    for (
                        let i = 0;
                        i < unlockedCopy.length;
                        i++
                    ) {

                        const distance =
                            calculateDistance(
                                current,
                                unlockedCopy[i]
                            );


                        if (
                            distance <
                            nearestDistance
                        ) {

                            nearestDistance =
                                distance;


                            nearestIndex =
                                i;

                        }

                    }


                    current =
                        unlockedCopy.splice(
                            nearestIndex,
                            1
                        )[0];


                    result.push(
                        current
                    );

                }


                // 잠긴 장소는 기존 위치 유지
                const finalRoute =
                    new Array(
                        places.length
                    ).fill(null);


                places.forEach(
                    (p, index) => {

                        if (
                            p.isLocked
                        ) {

                            finalRoute[index] =
                                p;

                        }

                    }
                );


                let resultIndex =
                    0;


                for (
                    let i = 0;
                    i < finalRoute.length;
                    i++
                ) {

                    if (
                        finalRoute[i] === null
                    ) {

                        finalRoute[i] =
                            result[
                                resultIndex++
                            ];

                    }

                }


                currentTrip.places =
                    finalRoute;


                await saveCurrentTrip();


                renderPlaces();


                alert(
                    '경로를 최적화했습니다!'
                );

            }
            catch (error) {

                console.error(
                    '경로 최적화 실패:',
                    error
                );


                alert(
                    '경로 최적화 중 오류가 발생했습니다.'
                );

            }
            finally {

                isOptimizing =
                    false;


                if (optimizeBtn) {

                    optimizeBtn.disabled =
                        false;

                }

            }

        }


        function calculateDistance(
            a,
            b
        ) {

            const lat1 =
                Number(a.lat);


            const lng1 =
                Number(a.lng);


            const lat2 =
                Number(b.lat);


            const lng2 =
                Number(b.lng);


            if (
                !Number.isFinite(lat1) ||
                !Number.isFinite(lat2)
            ) {

                return Infinity;

            }


            const R =
                6371;


            const dLat =
                toRad(
                    lat2 - lat1
                );


            const dLng =
                toRad(
                    lng2 - lng1
                );


            const x =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +
                Math.cos(
                    toRad(lat1)
                ) *
                Math.cos(
                    toRad(lat2)
                ) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);


            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                )
            );

        }


        function toRad(value) {

            return (
                value *
                Math.PI /
                180
            );

        }


        // =====================================================
        // 초기 장소 렌더링
        // =====================================================

        renderPlaces();


        console.log(
            '===== 상세 페이지 초기화 완료 ====='
        );

    }


    // =========================================================
    // HTML escape
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                'div'
            );


        div.textContent =
            value ?? '';


        return div.innerHTML;

    }

});
    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    console.log('페이지 확인:', {
        isDetailPage,
        isAddPage,
        isIndexPage
    });


    // =========================================================
    // 페이지 실행
    // =========================================================

    if (isDetailPage) {
        initDetailPage();
    }
    else if (isAddPage) {
        initAddPage();
    }
    else if (isIndexPage) {
        initIndexPage();
    }



    // =========================================================
    // Firestore에서 여행 전체 불러오기
    // =========================================================

    async function loadTrips() {

        try {

            const snapshot = await db
                .collection('trips')
                .get();

            trips = snapshot.docs.map(doc => {

                const data = doc.data();

                return {
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
                        Array.isArray(data.places)
                            ? data.places
                            : []
                };

            });

            console.log('Firestore 여행 데이터:', trips);

            return trips;

        }
        catch (error) {

            console.error(
                'Firestore 불러오기 실패:',
                error
            );

            alert(
                'Firestore에서 여행 정보를 불러오지 못했습니다.'
            );

            trips = [];

            return [];

        }

    }



    // =========================================================
    // 여행 하나 저장
    // =========================================================

    async function saveTrip(trip) {

        if (!trip) {
            console.error('저장할 여행이 없습니다.');
            return false;
        }

        try {

            const id = String(trip.id);

            await db
                .collection('trips')
                .doc(id)
                .set({

                    id: trip.id,

                    destination:
                        trip.destination || '',

                    startDate:
                        trip.startDate || '',

                    endDate:
                        trip.endDate || '',

                    activity:
                        trip.activity || '',

                    places:
                        Array.isArray(trip.places)
                            ? trip.places
                            : []

                }, {
                    merge: true
                });

            console.log(
                '여행 저장 완료:',
                id
            );

            return true;

        }
        catch (error) {

            console.error(
                '여행 저장 실패:',
                error
            );

            alert(
                '여행 저장에 실패했습니다.'
            );

            return false;

        }

    }



    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList =
            document.getElementById('trip-list');

        const calendarView =
            document.getElementById('calendar-view');

        const emptyState =
            document.getElementById('empty-state');

        const totalTripsEl =
            document.getElementById('total-trips');

        const upcomingTripsEl =
            document.getElementById('upcoming-trips');

        const pastTripsEl =
            document.getElementById('past-trips');

        const tabBtns =
            document.querySelectorAll('.tab-btn');

        const viewBtns =
            document.querySelectorAll('.view-btn');


        // -----------------------------------------
        // 검색
        // -----------------------------------------

        const searchNameInput =
            document.getElementById('search-name');

        const searchYearSelect =
            document.getElementById('search-year');

        const searchMonthSelect =
            document.getElementById('search-month');

        const searchBtn =
            document.getElementById('search-btn');


        // -----------------------------------------
        // 연도
        // -----------------------------------------

        if (searchYearSelect) {

            const currentYear =
                new Date().getFullYear();

            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {

                const option =
                    document.createElement('option');

                option.value = year;
                option.textContent = `${year}년`;

                searchYearSelect.appendChild(option);

            }

        }


        // -----------------------------------------
        // 초기 로딩
        // -----------------------------------------

        loadTrips().then(() => {

            renderTrips();
            updateStats();

        });


        // -----------------------------------------
        // 탭
        // -----------------------------------------

        tabBtns.forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    tabBtns.forEach(b =>
                        b.classList.remove('active')
                    );

                    btn.classList.add('active');

                    currentTab =
                        btn.dataset.tab;

                    renderTrips();

                }
            );

        });


        // -----------------------------------------
        // 보기 방식
        // -----------------------------------------

        viewBtns.forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    const title =
                        btn.getAttribute('title') || '';

                    if (
                        title.includes('리스트')
                    ) {

                        currentView = 'list';

                        if (tripList)
                            tripList.style.display = 'flex';

                        if (calendarView)
                            calendarView.style.display = 'none';

                        if (viewBtns[0])
                            viewBtns[0].classList.add('active');

                        if (viewBtns[1])
                            viewBtns[1].classList.remove('active');

                        renderTrips();

                    }
                    else {

                        currentView = 'calendar';

                        if (tripList)
                            tripList.style.display = 'none';

                        if (calendarView)
                            calendarView.style.display = 'flex';

                        if (viewBtns[0])
                            viewBtns[0].classList.remove('active');

                        if (viewBtns[1])
                            viewBtns[1].classList.add('active');

                        renderCalendar();

                    }

                }
            );

        });


        // -----------------------------------------
        // 검색
        // -----------------------------------------

        if (searchBtn) {

            searchBtn.addEventListener(
                'click',
                performSearch
            );

        }

        if (searchNameInput) {

            searchNameInput.addEventListener(
                'keypress',
                e => {

                    if (e.key === 'Enter') {
                        performSearch();
                    }

                }
            );

        }


        function performSearch() {

            const term =
                searchNameInput
                    ? searchNameInput.value
                        .trim()
                        .toLowerCase()
                    : '';

            const year =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';

            const month =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filtered =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate
                        );

                    const nameMatch =
                        (t.destination || '')
                            .toLowerCase()
                            .includes(term);

                    const yearMatch =
                        !year ||
                        String(
                            date.getFullYear()
                        ) === String(year);

                    const monthMatch =
                        !month ||
                        String(
                            date.getMonth() + 1
                        ) === String(month);

                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filtered);

        }



        // =====================================================
        // 여행 카드
        // =====================================================

        function renderTrips(
            tripsToRender = trips
        ) {

            if (!tripList) return;


            tripList
                .querySelectorAll('.trip-card')
                .forEach(card =>
                    card.remove()
                );


            const today =
                new Date();

            today.setHours(
                0, 0, 0, 0
            );


            let filtered =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate
                        );

                    start.setHours(
                        0, 0, 0, 0
                    );

                    if (
                        currentTab === 'upcoming'
                    ) {

                        return start >= today;

                    }

                    return start < today;

                });


            filtered.sort(
                (a, b) =>
                    new Date(a.startDate) -
                    new Date(b.startDate)
            );


            if (
                currentTab === 'past'
            ) {

                filtered.reverse();

            }


            if (
                filtered.length === 0
            ) {

                if (emptyState)
                    emptyState.style.display = 'flex';

                return;

            }


            if (emptyState)
                emptyState.style.display = 'none';


            filtered.forEach(t => {

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
                    async e => {

                        e.stopPropagation();

                        await deleteTrip(
                            t.id
                        );

                    }
                );


                // 카드 클릭
                card.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `trip_detail.html?id=${encodeURIComponent(String(t.id))}`;

                    }
                );


                tripList.appendChild(card);

            });

        }



        // =====================================================
        // 삭제
        // =====================================================

        async function deleteTrip(id) {

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


                trips =
                    trips.filter(
                        t =>
                            String(t.id) !==
                            String(id)
                    );


                renderTrips();
                updateStats();


            }
            catch (error) {

                console.error(
                    '삭제 실패:',
                    error
                );

                alert(
                    '여행 삭제에 실패했습니다.'
                );

            }

        }



        // =====================================================
        // 통계
        // =====================================================

        function updateStats() {

            const today =
                new Date();

            today.setHours(
                0, 0, 0, 0
            );


            const upcoming =
                trips.filter(t =>
                    new Date(t.startDate) >= today
                ).length;


            const past =
                trips.filter(t =>
                    new Date(t.startDate) < today
                ).length;


            if (totalTripsEl)
                totalTripsEl.textContent =
                    trips.length;

            if (upcomingTripsEl)
                upcomingTripsEl.textContent =
                    upcoming;

            if (pastTripsEl)
                pastTripsEl.textContent =
                    past;

        }



        // =====================================================
        // 캘린더
        // =====================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );

            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid) return;


            grid.innerHTML = '';


            const year =
                currentCalendarDate.getFullYear();

            const month =
                currentCalendarDate.getMonth();


            if (monthDisplay) {

                monthDisplay.textContent =
                    `${year}년 ${month + 1}월`;

            }


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            const daysInMonth =
                lastDay.getDate();


            const startDay =
                firstDay.getDay();


            for (
                let i = 0;
                i < startDay;
                i++
            ) {

                const empty =
                    document.createElement('div');

                empty.className =
                    'calendar-day empty';

                grid.appendChild(empty);

            }


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

                number.textContent =
                    day;


                div.appendChild(number);


                const dateStr =
                    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t =>
                        dateStr >= t.startDate &&
                        dateStr <= t.endDate
                    );


                dayTrips.forEach(t => {

                    const label =
                        document.createElement('div');

                    label.className =
                        'trip-label';

                    label.textContent =
                        t.destination;

                    div.appendChild(label);

                });


                grid.appendChild(div);

            }

        }


        const prev =
            document.getElementById(
                'prev-month'
            );

        const next =
            document.getElementById(
                'next-month'
            );


        if (prev) {

            prev.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1
                    );

                    renderCalendar();

                }
            );

        }


        if (next) {

            next.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1
                    );

                    renderCalendar();

                }
            );

        }

    }



    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById(
                'add-btn'
            );

        if (!addBtn) return;


        const destination =
            document.getElementById(
                'destination'
            );

        const startDate =
            document.getElementById(
                'start-date'
            );

        const endDate =
            document.getElementById(
                'end-date'
            );

        const activity =
            document.getElementById(
                'activity'
            );


        addBtn.addEventListener(
            'click',
            async () => {

                const destinationValue =
                    destination.value.trim();

                const startValue =
                    startDate.value;

                const endValue =
                    endDate.value;

                const activityValue =
                    activity
                        ? activity.value.trim()
                        : '';


                if (
                    !destinationValue ||
                    !startValue ||
                    !endValue
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;

                }


                if (
                    endValue < startValue
                ) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;

                }


                const id =
                    String(Date.now());


                const newTrip = {

                    id,

                    destination:
                        destinationValue,

                    startDate:
                        startValue,

                    endDate:
                        endValue,

                    activity:
                        activityValue,

                    places: []

                };


                const success =
                    await saveTrip(
                        newTrip
                    );


                if (success) {

                    window.location.href =
                        'index.html';

                }

            }
        );

    }



    // =========================================================
    // ★ DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        console.log(
            '===== 상세 페이지 시작 ====='
        );


        // -----------------------------------------
        // Leaflet 확인
        // -----------------------------------------

        if (
            typeof L === 'undefined'
        ) {

            console.error(
                'Leaflet이 로드되지 않았습니다.'
            );

            alert(
                '지도 라이브러리를 불러오지 못했습니다.'
            );

            return;

        }


        // -----------------------------------------
        // URL에서 ID 가져오기
        // -----------------------------------------

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            params.get('id');


        console.log(
            'URL 여행 ID:',
            tripId
        );


        if (!tripId) {

            alert(
                '여행 ID가 없습니다.'
            );

            window.location.href =
                'index.html';

            return;

        }


        // -----------------------------------------
        // Firestore 직접 조회
        // -----------------------------------------
        //
        // ★ 여기서 전체 trips를 불러오는 것보다
        // 해당 문서 하나만 가져오는 게 훨씬 안전함.
        //

        try {

            const doc =
                await db
                    .collection('trips')
                    .doc(String(tripId))
                    .get();


            if (!doc.exists) {

                console.error(
                    '여행 문서 없음:',
                    tripId
                );

                alert(
                    '여행 정보를 찾을 수 없습니다.'
                );

                window.location.href =
                    'index.html';

                return;

            }


            const data =
                doc.data();


            currentTrip = {

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
                    Array.isArray(data.places)
                        ? data.places
                        : []

            };


            console.log(
                '상세 여행 데이터:',
                currentTrip
            );


        }
        catch (error) {

            console.error(
                '여행 조회 실패:',
                error
            );

            alert(
                '여행 정보를 불러오지 못했습니다.'
            );

            return;

        }



        // -----------------------------------------
        // HTML 요소
        // -----------------------------------------

        const title =
            document.getElementById(
                'trip-title'
            );

        const dates =
            document.getElementById(
                'trip-dates'
            );

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

        const mapElement =
            document.getElementById(
                'map'
            );


        // -----------------------------------------
        // 제목
        // -----------------------------------------

        if (title) {

            title.textContent =
                currentTrip.destination;

        }


        if (dates) {

            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

        }



        // =====================================================
        // ★★★ MAP 초기화 ★★★
        // =====================================================

        console.log(
            '지도 초기화 시작'
        );


        if (!mapElement) {

            console.error(
                '#map 요소가 없습니다.'
            );

            alert(
                '지도 영역을 찾을 수 없습니다.'
            );

            return;

        }


        // 지도 높이 확인
        console.log(
            '지도 크기:',
            mapElement.offsetWidth,
            mapElement.offsetHeight
        );


        const map =
            L.map(
                mapElement
            ).setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {

                maxZoom: 19,

                attribution:
                    '&copy; OpenStreetMap contributors'

            }
        ).addTo(map);


        console.log(
            'Leaflet 지도 생성 완료'
        );


        // 지도 크기 재계산
        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );



        // =====================================================
        // 장소 렌더링
        // =====================================================

        function renderPlaces() {

            console.log(
                '장소 렌더링:',
                currentTrip.places
            );


            placesList.innerHTML = '';


            // 마커/선 제거
            map.eachLayer(
                layer => {

                    if (
                        layer instanceof L.Marker ||
                        layer instanceof L.Polyline
                    ) {

                        map.removeLayer(layer);

                    }

                }
            );


            if (
                !currentTrip.places ||
                currentTrip.places.length === 0
            ) {

                placesList.innerHTML = `

                    <div class="empty-places">

                        <p>
                            방문할 장소를 추가해보세요!
                        </p>

                    </div>

                `;

                return;

            }


            const latlngs = [];


            currentTrip.places.forEach(
                (place, index) => {

                    // -------------------------------
                    // 목록
                    // -------------------------------

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'place-item' +
                        (
                            place.isLocked
                                ? ' locked'
                                : ''
                        );


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
                            class="lock-btn ${
                                place.isLocked
                                    ? 'active'
                                    : ''
                            }"
                        >
                            <i class="fa-solid ${
                                place.isLocked
                                    ? 'fa-lock'
                                    : 'fa-lock-open'
                            }"></i>
                        </button>

                        <button
                            class="remove-place-btn"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    `;


                    // 잠금
                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    lockBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();

                            place.isLocked =
                                !place.isLocked;

                            await saveCurrentTrip();

                            renderPlaces();

                        }
                    );


                    // 삭제
                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    removeBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();

                            if (
                                !confirm(
                                    `"${place.name}" 장소를 삭제할까요?`
                                )
                            ) {
                                return;
                            }


                            currentTrip.places =
                                currentTrip.places.filter(
                                    p =>
                                        String(p.id) !==
                                        String(place.id)
                                );


                            await saveCurrentTrip();

                            renderPlaces();

                        }
                    );


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

                                await updateOrder();

                            }
                        );

                    }


                    placesList.appendChild(item);


                    // -------------------------------
                    // 지도 마커
                    // -------------------------------

                    const lat =
                        Number(place.lat);

                    const lng =
                        Number(place.lng);


                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                    ) {

                        L.marker(
                            [lat, lng]
                        )
                            .addTo(map)
                            .bindPopup(
                                `${index + 1}. ${escapeHtml(place.name)}`
                            );


                        latlngs.push(
                            [lat, lng]
                        );

                    }

                }
            );


            // -------------------------------
            // 경로
            // -------------------------------

            if (
                latlngs.length > 1
            ) {

                L.polyline(
                    latlngs
                ).addTo(map);


                map.fitBounds(
                    latlngs,
                    {
                        padding: [40, 40]
                    }
                );

            }
            else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    14
                );

            }

        }



        // =====================================================
        // 현재 여행 저장
        // =====================================================

        async function saveCurrentTrip() {

            return await saveTrip(
                currentTrip
            );

        }



        // =====================================================
        // 장소 추가
        // =====================================================

        async function addPlace() {

            const name =
                placeInput.value.trim();


            if (!name) {

                alert(
                    '장소를 입력해주세요.'
                );

                return;

            }


            addPlaceBtn.disabled =
                true;


            try {

                console.log(
                    '장소 검색:',
                    name
                );


                const url =
                    'https://nominatim.openstreetmap.org/search' +
                    '?format=json' +
                    '&limit=1' +
                    '&q=' +
                    encodeURIComponent(name);


                const response =
                    await fetch(
                        url,
                        {
                            headers: {
                                'Accept':
                                    'application/json'
                            }
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }


                const data =
                    await response.json();


                console.log(
                    '검색 결과:',
                    data
                );


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

                    id:
                        String(Date.now()),

                    name,

                    lat:
                        Number(result.lat),

                    lng:
                        Number(result.lon),

                    isLocked:
                        false

                };


                currentTrip.places.push(
                    newPlace
                );


                const success =
                    await saveCurrentTrip();


                if (!success) {

                    // 저장 실패하면 되돌림
                    currentTrip.places.pop();

                    return;

                }


                placeInput.value = '';

                renderPlaces();


            }
            catch (error) {

                console.error(
                    '장소 추가 오류:',
                    error
                );

                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            }
            finally {

                addPlaceBtn.disabled =
                    false;

            }

        }


        if (addPlaceBtn) {

            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        if (placeInput) {

            placeInput.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();

                        addPlace();

                    }

                }
            );

        }



        // =====================================================
        // 드래그 정렬
        // =====================================================

        placesList.addEventListener(
            'dragover',
            e => {

                e.preventDefault();


                const dragging =
                    placesList.querySelector(
                        '.dragging'
                    );


                if (!dragging) return;


                const after =
                    getDragAfterElement(
                        placesList,
                        e.clientY
                    );


                if (!after) {

                    placesList.appendChild(
                        dragging
                    );

                }
                else {

                    placesList.insertBefore(
                        dragging,
                        after
                    );

                }

            }
        );


        function getDragAfterElement(
            container,
            y
        ) {

            const elements =
                [
                    ...container.querySelectorAll(
                        '.place-item:not(.dragging)'
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
                        offset > closest.offset
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



        async function updateOrder() {

            const items =
                placesList.querySelectorAll(
                    '.place-item'
                );


            const ids =
                [...items].map(
                    item =>
                        String(
                            item.dataset.id
                        )
                );


            const reordered = [];


            ids.forEach(id => {

                const found =
                    currentTrip.places.find(
                        p =>
                            String(p.id) === id
                    );


                if (found) {

                    reordered.push(
                        found
                    );

                }

            });


            if (
                reordered.length ===
                currentTrip.places.length
            ) {

                currentTrip.places =
                    reordered;

                await saveCurrentTrip();

                renderPlaces();

            }

        }



        // =====================================================
        // 경로 최적화
        // =====================================================

        if (optimizeBtn) {

            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        async function optimizeRoute() {

            const places =
                currentTrip.places;


            if (
                !places ||
                places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );

                return;

            }


            const unlocked =
                places.filter(
                    p => !p.isLocked
                );


            if (
                unlocked.length < 2
            ) {

                alert(
                    '잠금 해제된 장소가 2개 이상 필요합니다.'
                );

                return;

            }


            // 가장 단순하고 안정적인 최근접 이웃 방식
            const locked =
                places.filter(
                    p => p.isLocked
                );


            const unlockedCopy =
                [...unlocked];


            const result = [];


            // 첫 번째 장소
            let current =
                unlockedCopy.shift();


            result.push(current);


            while (
                unlockedCopy.length > 0
            ) {

                let nearestIndex = 0;
                let nearestDistance =
                    Infinity;


                for (
                    let i = 0;
                    i < unlockedCopy.length;
                    i++
                ) {

                    const distance =
                        calculateDistance(
                            current,
                            unlockedCopy[i]
                        );


                    if (
                        distance <
                        nearestDistance
                    ) {

                        nearestDistance =
                            distance;

                        nearestIndex =
                            i;

                    }

                }


                current =
                    unlockedCopy.splice(
                        nearestIndex,
                        1
                    )[0];


                result.push(
                    current
                );

            }


            // 잠긴 장소는 기존 위치 유지
            const finalRoute =
                new Array(
                    places.length
                ).fill(null);


            places.forEach(
                (p, index) => {

                    if (p.isLocked) {

                        finalRoute[index] =
                            p;

                    }

                }
            );


            let resultIndex = 0;


            for (
                let i = 0;
                i < finalRoute.length;
                i++
            ) {

                if (
                    finalRoute[i] === null
                ) {

                    finalRoute[i] =
                        result[resultIndex++];

                }

            }


            currentTrip.places =
                finalRoute;


            await saveCurrentTrip();

            renderPlaces();


            alert(
                '경로를 최적화했습니다!'
            );

        }



        function calculateDistance(
            a,
            b
        ) {

            const lat1 =
                Number(a.lat);

            const lng1 =
                Number(a.lng);

            const lat2 =
                Number(b.lat);

            const lng2 =
                Number(b.lng);


            if (
                !Number.isFinite(lat1) ||
                !Number.isFinite(lat2)
            ) {

                return Infinity;

            }


            const R = 6371;


            const dLat =
                toRad(lat2 - lat1);

            const dLng =
                toRad(lng2 - lng1);


            const x =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);


            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                )
            );

        }


        function toRad(value) {

            return value *
                Math.PI /
                180;

        }



        // =====================================================
        // ★ 마지막으로 장소 렌더링
        // =====================================================

        renderPlaces();


        console.log(
            '===== 상세 페이지 초기화 완료 ====='
        );

    }



    // =========================================================
    // HTML escape
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                'div'
            );

        div.textContent =
            value ?? '';

        return div.innerHTML;

    }

});
    let trips = [];
    let currentTab = 'upcoming';
    let currentView = 'list';
    let currentCalendarDate = new Date();
    let currentTrip = null;


    // =========================================================
    // 페이지 확인
    // =========================================================

    const isDetailPage =
        document.getElementById('map') &&
        document.getElementById('places-list');

    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    console.log('페이지 확인:', {
        isDetailPage,
        isAddPage,
        isIndexPage
    });


    // =========================================================
    // 페이지 실행
    // =========================================================

    if (isDetailPage) {
        initDetailPage();
    }
    else if (isAddPage) {
        initAddPage();
    }
    else if (isIndexPage) {
        initIndexPage();
    }


    // =========================================================
    // Firestore에서 여행 전체 불러오기
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


                    return {

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
                            Array.isArray(data.places)
                                ? data.places
                                : []

                    };

                });


            console.log(
                'Firestore 여행 데이터:',
                trips
            );


            return trips;

        }
        catch (error) {

            console.error(
                'Firestore 불러오기 실패:',
                error
            );


            alert(
                'Firestore에서 여행 정보를 불러오지 못했습니다.'
            );


            trips = [];


            return [];

        }

    }


    // =========================================================
    // 여행 하나 저장
    // =========================================================

    async function saveTrip(trip) {

        if (!trip) {

            console.error(
                '저장할 여행이 없습니다.'
            );

            return false;

        }


        try {

            const id =
                String(trip.id);


            await db
                .collection('trips')
                .doc(id)
                .set({

                    id:
                        trip.id,

                    destination:
                        trip.destination || '',

                    startDate:
                        trip.startDate || '',

                    endDate:
                        trip.endDate || '',

                    activity:
                        trip.activity || '',

                    places:
                        Array.isArray(trip.places)
                            ? trip.places
                            : []

                }, {

                    merge: true

                });


            console.log(
                '여행 저장 완료:',
                id
            );


            return true;

        }
        catch (error) {

            console.error(
                '여행 저장 실패:',
                error
            );


            alert(
                '여행 저장에 실패했습니다.'
            );


            return false;

        }

    }


    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList =
            document.getElementById(
                'trip-list'
            );

        const calendarView =
            document.getElementById(
                'calendar-view'
            );

        const emptyState =
            document.getElementById(
                'empty-state'
            );

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

        const tabBtns =
            document.querySelectorAll(
                '.tab-btn'
            );

        const viewBtns =
            document.querySelectorAll(
                '.view-btn'
            );


        // =====================================================
        // 검색
        // =====================================================

        const searchNameInput =
            document.getElementById(
                'search-name'
            );

        const searchYearSelect =
            document.getElementById(
                'search-year'
            );

        const searchMonthSelect =
            document.getElementById(
                'search-month'
            );

        const searchBtn =
            document.getElementById(
                'search-btn'
            );


        // =====================================================
        // 연도
        // =====================================================

        if (
            searchYearSelect &&
            searchYearSelect.dataset.initialized !== 'true'
        ) {

            searchYearSelect.dataset.initialized =
                'true';


            const currentYear =
                new Date().getFullYear();


            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    year;


                option.textContent =
                    `${year}년`;


                searchYearSelect.appendChild(
                    option
                );

            }

        }


        // =====================================================
        // 초기 로딩
        // =====================================================

        loadTrips().then(() => {

            renderTrips();

            updateStats();

        });


        // =====================================================
        // 탭
        // =====================================================

        tabBtns.forEach(btn => {

            if (
                btn.dataset.listenerAdded === 'true'
            ) {
                return;
            }


            btn.dataset.listenerAdded =
                'true';


            btn.addEventListener(
                'click',
                () => {

                    tabBtns.forEach(b =>
                        b.classList.remove(
                            'active'
                        )
                    );


                    btn.classList.add(
                        'active'
                    );


                    currentTab =
                        btn.dataset.tab;


                    renderTrips();

                }
            );

        });


        // =====================================================
        // 보기 방식
        // =====================================================

        viewBtns.forEach(btn => {

            if (
                btn.dataset.listenerAdded === 'true'
            ) {
                return;
            }


            btn.dataset.listenerAdded =
                'true';


            btn.addEventListener(
                'click',
                () => {

                    const title =
                        btn.getAttribute(
                            'title'
                        ) || '';


                    if (
                        title.includes('리스트')
                    ) {

                        currentView =
                            'list';


                        if (tripList) {

                            tripList.style.display =
                                'flex';

                        }


                        if (calendarView) {

                            calendarView.style.display =
                                'none';

                        }


                        if (viewBtns[0]) {

                            viewBtns[0].classList.add(
                                'active'
                            );

                        }


                        if (viewBtns[1]) {

                            viewBtns[1].classList.remove(
                                'active'
                            );

                        }


                        renderTrips();

                    }
                    else {

                        currentView =
                            'calendar';


                        if (tripList) {

                            tripList.style.display =
                                'none';

                        }


                        if (calendarView) {

                            calendarView.style.display =
                                'flex';

                        }


                        if (viewBtns[0]) {

                            viewBtns[0].classList.remove(
                                'active'
                            );

                        }


                        if (viewBtns[1]) {

                            viewBtns[1].classList.add(
                                'active'
                            );

                        }


                        renderCalendar();

                    }

                }
            );

        });


        // =====================================================
        // 검색 버튼
        // =====================================================

        if (
            searchBtn &&
            searchBtn.dataset.listenerAdded !== 'true'
        ) {

            searchBtn.dataset.listenerAdded =
                'true';


            searchBtn.addEventListener(
                'click',
                performSearch
            );

        }


        // =====================================================
        // 검색 Enter
        // =====================================================

        if (
            searchNameInput &&
            searchNameInput.dataset.listenerAdded !== 'true'
        ) {

            searchNameInput.dataset.listenerAdded =
                'true';


            searchNameInput.addEventListener(
                'keypress',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        performSearch();

                    }

                }
            );

        }


        // =====================================================
        // 검색 실행
        // =====================================================

        function performSearch() {

            const term =
                searchNameInput
                    ? searchNameInput.value
                        .trim()
                        .toLowerCase()
                    : '';


            const year =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';


            const month =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filtered =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate
                        );


                    const nameMatch =
                        (t.destination || '')
                            .toLowerCase()
                            .includes(term);


                    const yearMatch =
                        !year ||
                        String(
                            date.getFullYear()
                        ) === String(year);


                    const monthMatch =
                        !month ||
                        String(
                            date.getMonth() + 1
                        ) === String(month);


                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filtered);

        }


        // =====================================================
        // 여행 카드
        // =====================================================

        function renderTrips(
            tripsToRender = trips
        ) {

            if (!tripList) {
                return;
            }


            tripList
                .querySelectorAll(
                    '.trip-card'
                )
                .forEach(card =>
                    card.remove()
                );


            const today =
                new Date();


            today.setHours(
                0,
                0,
                0,
                0
            );


            let filtered =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate
                        );


                    start.setHours(
                        0,
                        0,
                        0,
                        0
                    );


                    if (
                        currentTab === 'upcoming'
                    ) {

                        return start >= today;

                    }


                    return start < today;

                });


            filtered.sort(
                (a, b) =>
                    new Date(a.startDate) -
                    new Date(b.startDate)
            );


            if (
                currentTab === 'past'
            ) {

                filtered.reverse();

            }


            if (
                filtered.length === 0
            ) {

                if (emptyState) {

                    emptyState.style.display =
                        'flex';

                }


                return;

            }


            if (emptyState) {

                emptyState.style.display =
                    'none';

            }


            filtered.forEach(t => {

                const card =
                    document.createElement(
                        'div'
                    );


                card.className =
                    'trip-card';


                card.innerHTML = `

                    <div class="trip-info">

                        <h3>
                            ${escapeHtml(
                                t.destination
                            )}
                        </h3>

                        <p>
                            ${escapeHtml(
                                t.startDate
                            )}
                            ~
                            ${escapeHtml(
                                t.endDate
                            )}
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


                if (deleteBtn) {

                    deleteBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();


                            await deleteTrip(
                                t.id
                            );

                        }
                    );

                }


                card.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `trip_detail.html?id=${encodeURIComponent(
                                String(t.id)
                            )}`;

                    }
                );


                tripList.appendChild(
                    card
                );

            });

        }


        // =====================================================
        // 삭제
        // =====================================================

        async function deleteTrip(id) {

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


                trips =
                    trips.filter(
                        t =>
                            String(t.id) !==
                            String(id)
                    );


                renderTrips();

                updateStats();

            }
            catch (error) {

                console.error(
                    '삭제 실패:',
                    error
                );


                alert(
                    '여행 삭제에 실패했습니다.'
                );

            }

        }


        // =====================================================
        // 통계
        // =====================================================

        function updateStats() {

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
                            t.startDate
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
                            t.startDate
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


        // =====================================================
        // 캘린더
        // =====================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );


            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid) {
                return;
            }


            grid.innerHTML =
                '';


            const year =
                currentCalendarDate.getFullYear();


            const month =
                currentCalendarDate.getMonth();


            if (monthDisplay) {

                monthDisplay.textContent =
                    `${year}년 ${month + 1}월`;

            }


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            const daysInMonth =
                lastDay.getDate();


            const startDay =
                firstDay.getDay();


            for (
                let i = 0;
                i < startDay;
                i++
            ) {

                const empty =
                    document.createElement(
                        'div'
                    );


                empty.className =
                    'calendar-day empty';


                grid.appendChild(
                    empty
                );

            }


            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {

                const div =
                    document.createElement(
                        'div'
                    );


                div.className =
                    'calendar-day';


                const number =
                    document.createElement(
                        'span'
                    );


                number.textContent =
                    day;


                div.appendChild(
                    number
                );


                const dateStr =
                    `${year}-${String(
                        month + 1
                    ).padStart(2, '0')}-${String(
                        day
                    ).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t =>
                        dateStr >= t.startDate &&
                        dateStr <= t.endDate
                    );


                dayTrips.forEach(t => {

                    const label =
                        document.createElement(
                            'div'
                        );


                    label.className =
                        'trip-label';


                    label.textContent =
                        t.destination;


                    div.appendChild(
                        label
                    );

                });


                grid.appendChild(
                    div
                );

            }

        }


        const prev =
            document.getElementById(
                'prev-month'
            );


        const next =
            document.getElementById(
                'next-month'
            );


        if (
            prev &&
            prev.dataset.listenerAdded !== 'true'
        ) {

            prev.dataset.listenerAdded =
                'true';


            prev.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1
                    );


                    renderCalendar();

                }
            );

        }


        if (
            next &&
            next.dataset.listenerAdded !== 'true'
        ) {

            next.dataset.listenerAdded =
                'true';


            next.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1
                    );


                    renderCalendar();

                }
            );

        }

    }


    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById(
                'add-btn'
            );


        if (!addBtn) {
            return;
        }


        // -----------------------------------------------------
        // ★ 이미 이벤트가 등록되어 있으면 다시 등록하지 않음
        // -----------------------------------------------------

        if (
            addBtn.dataset.listenerAdded === 'true'
        ) {

            console.warn(
                '일정 추가 버튼 이벤트가 이미 등록되어 있습니다.'
            );

            return;

        }


        addBtn.dataset.listenerAdded =
            'true';


        const destination =
            document.getElementById(
                'destination'
            );


        const startDate =
            document.getElementById(
                'start-date'
            );


        const endDate =
            document.getElementById(
                'end-date'
            );


        const activity =
            document.getElementById(
                'activity'
            );


        // -----------------------------------------------------
        // ★ 중복 저장 방지용 상태
        // -----------------------------------------------------

        let isSaving =
            false;


        // -----------------------------------------------------
        // 일정 추가
        // -----------------------------------------------------

        addBtn.addEventListener(
            'click',
            async () => {

                // 이미 저장 중이면 아무것도 하지 않음
                if (isSaving) {

                    console.warn(
                        '이미 일정 저장 중입니다.'
                    );

                    return;

                }


                const destinationValue =
                    destination
                        ? destination.value.trim()
                        : '';


                const startValue =
                    startDate
                        ? startDate.value
                        : '';


                const endValue =
                    endDate
                        ? endDate.value
                        : '';


                const activityValue =
                    activity
                        ? activity.value.trim()
                        : '';


                // -------------------------------------------------
                // 필수값 확인
                // -------------------------------------------------

                if (
                    !destinationValue ||
                    !startValue ||
                    !endValue
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;

                }


                // -------------------------------------------------
                // 날짜 확인
                // -------------------------------------------------

                if (
                    endValue < startValue
                ) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;

                }


                // -------------------------------------------------
                // ★ 저장 시작
                // -------------------------------------------------

                isSaving =
                    true;


                addBtn.disabled =
                    true;


                const originalText =
                    addBtn.innerHTML;


                addBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    저장 중...
                `;


                try {

                    // -------------------------------------------------
                    // ID 생성
                    // -------------------------------------------------

                    const id =
                        String(
                            Date.now()
                        );


                    const newTrip = {

                        id,

                        destination:
                            destinationValue,

                        startDate:
                            startValue,

                        endDate:
                            endValue,

                        activity:
                            activityValue,

                        places:
                            []

                    };


                    console.log(
                        '새 여행 저장 시작:',
                        newTrip
                    );


                    // -------------------------------------------------
                    // ★ Firestore 한 번만 저장
                    // -------------------------------------------------

                    const success =
                        await saveTrip(
                            newTrip
                        );


                    if (success) {

                        console.log(
                            '새 여행 저장 성공:',
                            id
                        );


                        // 저장 성공 후에만 이동
                        window.location.href =
                            'index.html';


                        return;

                    }


                    // 저장 실패
                    isSaving =
                        false;


                    addBtn.disabled =
                        false;


                    addBtn.innerHTML =
                        originalText;

                }
                catch (error) {

                    console.error(
                        '일정 추가 실패:',
                        error
                    );


                    alert(
                        '일정을 추가하는 중 오류가 발생했습니다.'
                    );


                    isSaving =
                        false;


                    addBtn.disabled =
                        false;


                    addBtn.innerHTML =
                        originalText;

                }

            }
        );


        // =====================================================
        // Enter로 일정 추가
        // =====================================================

        const formInputs = [
            destination,
            startDate,
            endDate,
            activity
        ];


        formInputs.forEach(input => {

            if (!input) {
                return;
            }


            if (
                input.dataset.listenerAdded === 'true'
            ) {

                return;

            }


            input.dataset.listenerAdded =
                'true';


            input.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();


                        // 버튼의 click 이벤트 하나만 실행
                        if (!isSaving) {

                            addBtn.click();

                        }

                    }

                }
            );

        });

    }


    // =========================================================
    // DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        console.log(
            '===== 상세 페이지 시작 ====='
        );


        // =====================================================
        // Leaflet 확인
        // =====================================================

        if (
            typeof L === 'undefined'
        ) {

            console.error(
                'Leaflet이 로드되지 않았습니다.'
            );


            alert(
                '지도 라이브러리를 불러오지 못했습니다.'
            );


            return;

        }


        // =====================================================
        // URL ID
        // =====================================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            params.get('id');


        console.log(
            'URL 여행 ID:',
            tripId
        );


        if (!tripId) {

            alert(
                '여행 ID가 없습니다.'
            );


            window.location.href =
                'index.html';


            return;

        }


        // =====================================================
        // Firestore에서 여행 하나 조회
        // =====================================================

        try {

            const doc =
                await db
                    .collection('trips')
                    .doc(String(tripId))
                    .get();


            if (!doc.exists) {

                console.error(
                    '여행 문서 없음:',
                    tripId
                );


                alert(
                    '여행 정보를 찾을 수 없습니다.'
                );


                window.location.href =
                    'index.html';


                return;

            }


            const data =
                doc.data();


            currentTrip = {

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
                    Array.isArray(data.places)
                        ? data.places
                        : []

            };


            console.log(
                '상세 여행 데이터:',
                currentTrip
            );

        }
        catch (error) {

            console.error(
                '여행 조회 실패:',
                error
            );


            alert(
                '여행 정보를 불러오지 못했습니다.'
            );


            return;

        }


        // =====================================================
        // HTML 요소
        // =====================================================

        const title =
            document.getElementById(
                'trip-title'
            );


        const dates =
            document.getElementById(
                'trip-dates'
            );


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


        const mapElement =
            document.getElementById(
                'map'
            );


        // =====================================================
        // 제목 / 날짜
        // =====================================================

        if (title) {

            title.textContent =
                currentTrip.destination;

        }


        if (dates) {

            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

        }


        // =====================================================
        // 지도
        // =====================================================

        if (!mapElement) {

            console.error(
                '#map 요소가 없습니다.'
            );


            alert(
                '지도 영역을 찾을 수 없습니다.'
            );


            return;

        }


        const map =
            L.map(
                mapElement
            ).setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {

                maxZoom:
                    19,

                attribution:
                    '&copy; OpenStreetMap contributors'

            }
        ).addTo(
            map
        );


        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );


        // =====================================================
        // 장소 렌더링
        // =====================================================

        function renderPlaces() {

            if (!placesList) {
                return;
            }


            placesList.innerHTML =
                '';


            map.eachLayer(
                layer => {

                    if (
                        layer instanceof L.Marker ||
                        layer instanceof L.Polyline
                    ) {

                        map.removeLayer(
                            layer
                        );

                    }

                }
            );


            if (
                !currentTrip.places ||
                currentTrip.places.length === 0
            ) {

                placesList.innerHTML = `

                    <div class="empty-places">

                        <p>
                            방문할 장소를 추가해보세요!
                        </p>

                    </div>

                `;


                return;

            }


            const latlngs =
                [];


            currentTrip.places.forEach(
                (place, index) => {

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'place-item' +
                        (
                            place.isLocked
                                ? ' locked'
                                : ''
                        );


                    item.dataset.id =
                        String(
                            place.id
                        );


                    item.draggable =
                        !place.isLocked;


                    item.innerHTML = `

                        <span class="place-number">
                            ${index + 1}
                        </span>

                        <span class="place-name">
                            ${escapeHtml(
                                place.name
                            )}
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


                    // =================================================
                    // 잠금
                    // =================================================

                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    if (lockBtn) {

                        lockBtn.addEventListener(
                            'click',
                            async e => {

                                e.stopPropagation();


                                place.isLocked =
                                    !place.isLocked;


                                await saveCurrentTrip();


                                renderPlaces();

                            }
                        );

                    }


                    // =================================================
                    // 삭제
                    // =================================================

                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    if (removeBtn) {

                        removeBtn.addEventListener(
                            'click',
                            async e => {

                                e.stopPropagation();


                                if (
                                    !confirm(
                                        `"${place.name}" 장소를 삭제할까요?`
                                    )
                                ) {

                                    return;

                                }


                                currentTrip.places =
                                    currentTrip.places.filter(
                                        p =>
                                            String(p.id) !==
                                            String(place.id)
                                    );


                                await saveCurrentTrip();


                                renderPlaces();

                            }
                        );

                    }


                    // =================================================
                    // 드래그
                    // =================================================

                    if (
                        !place.isLocked
                    ) {

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


                    // =================================================
                    // 지도 마커
                    // =================================================

                    const lat =
                        Number(
                            place.lat
                        );


                    const lng =
                        Number(
                            place.lng
                        );


                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                    ) {

                        L.marker(
                            [lat, lng]
                        )
                            .addTo(map)
                            .bindPopup(
                                `${index + 1}. ${escapeHtml(
                                    place.name
                                )}`
                            );


                        latlngs.push(
                            [lat, lng]
                        );

                    }

                }
            );


            // =====================================================
            // 경로
            // =====================================================

            if (
                latlngs.length > 1
            ) {

                L.polyline(
                    latlngs
                ).addTo(
                    map
                );


                map.fitBounds(
                    latlngs,
                    {
                        padding: [
                            40,
                            40
                        ]
                    }
                );

            }
            else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    14
                );

            }

        }


        // =====================================================
        // 현재 여행 저장
        // =====================================================

        async function saveCurrentTrip() {

            return await saveTrip(
                currentTrip
            );

        }


        // =====================================================
        // 장소 추가
        // =====================================================

        let isAddingPlace =
            false;


        async function addPlace() {

            if (isAddingPlace) {
                return;
            }


            if (!placeInput) {
                return;
            }


            const name =
                placeInput.value.trim();


            if (!name) {

                alert(
                    '장소를 입력해주세요.'
                );


                return;

            }


            isAddingPlace =
                true;


            if (addPlaceBtn) {

                addPlaceBtn.disabled =
                    true;

            }


            try {

                const url =
                    'https://nominatim.openstreetmap.org/search' +
                    '?format=json' +
                    '&limit=1' +
                    '&q=' +
                    encodeURIComponent(name);


                const response =
                    await fetch(
                        url,
                        {

                            headers: {

                                Accept:
                                    'application/json'

                            }

                        }
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

                    id:
                        String(
                            Date.now()
                        ),

                    name,

                    lat:
                        Number(
                            result.lat
                        ),

                    lng:
                        Number(
                            result.lon
                        ),

                    isLocked:
                        false

                };


                currentTrip.places.push(
                    newPlace
                );


                const success =
                    await saveCurrentTrip();


                if (!success) {

                    currentTrip.places.pop();


                    return;

                }


                placeInput.value =
                    '';


                renderPlaces();

            }
            catch (error) {

                console.error(
                    '장소 추가 오류:',
                    error
                );


                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            }
            finally {

                isAddingPlace =
                    false;


                if (addPlaceBtn) {

                    addPlaceBtn.disabled =
                        false;

                }

            }

        }


        // =====================================================
        // 장소 추가 버튼
        // =====================================================

        if (
            addPlaceBtn &&
            addPlaceBtn.dataset.listenerAdded !== 'true'
        ) {

            addPlaceBtn.dataset.listenerAdded =
                'true';


            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        // =====================================================
        // 장소 Enter
        // =====================================================

        if (
            placeInput &&
            placeInput.dataset.listenerAdded !== 'true'
        ) {

            placeInput.dataset.listenerAdded =
                'true';


            placeInput.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();


                        addPlace();

                    }

                }
            );

        }


        // =====================================================
        // 드래그 정렬
        // =====================================================

        if (
            placesList &&
            placesList.dataset.listenerAdded !== 'true'
        ) {

            placesList.dataset.listenerAdded =
                'true';


            placesList.addEventListener(
                'dragover',
                e => {

                    e.preventDefault();


                    const dragging =
                        placesList.querySelector(
                            '.dragging'
                        );


                    if (!dragging) {
                        return;
                    }


                    const after =
                        getDragAfterElement(
                            placesList,
                            e.clientY
                        );


                    if (!after) {

                        placesList.appendChild(
                            dragging
                        );

                    }
                    else {

                        placesList.insertBefore(
                            dragging,
                            after
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
                        '.place-item:not(.dragging)'
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
                        offset > closest.offset
                    ) {

                        closest = {

                            offset,

                            element:
                                child

                        };

                    }

                }
            );


            return closest.element;

        }


        // =====================================================
        // 순서 업데이트
        // =====================================================

        async function updateOrder() {

            if (!placesList) {
                return;
            }


            const items =
                placesList.querySelectorAll(
                    '.place-item'
                );


            const ids =
                [...items].map(
                    item =>
                        String(
                            item.dataset.id
                        )
                );


            const reordered =
                [];


            ids.forEach(id => {

                const found =
                    currentTrip.places.find(
                        p =>
                            String(p.id) ===
                            id
                    );


                if (found) {

                    reordered.push(
                        found
                    );

                }

            });


            if (
                reordered.length ===
                currentTrip.places.length
            ) {

                currentTrip.places =
                    reordered;


                await saveCurrentTrip();


                renderPlaces();

            }

        }


        // =====================================================
        // 경로 최적화
        // =====================================================

        if (
            optimizeBtn &&
            optimizeBtn.dataset.listenerAdded !== 'true'
        ) {

            optimizeBtn.dataset.listenerAdded =
                'true';


            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        let isOptimizing =
            false;


        async function optimizeRoute() {

            if (isOptimizing) {
                return;
            }


            const places =
                currentTrip.places;


            if (
                !places ||
                places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );


                return;

            }


            const unlocked =
                places.filter(
                    p =>
                        !p.isLocked
                );


            if (
                unlocked.length < 2
            ) {

                alert(
                    '잠금 해제된 장소가 2개 이상 필요합니다.'
                );


                return;

            }


            isOptimizing =
                true;


            if (optimizeBtn) {

                optimizeBtn.disabled =
                    true;

            }


            try {

                const unlockedCopy =
                    [...unlocked];


                const result =
                    [];


                let current =
                    unlockedCopy.shift();


                result.push(
                    current
                );


                while (
                    unlockedCopy.length > 0
                ) {

                    let nearestIndex =
                        0;


                    let nearestDistance =
                        Infinity;


                    for (
                        let i = 0;
                        i < unlockedCopy.length;
                        i++
                    ) {

                        const distance =
                            calculateDistance(
                                current,
                                unlockedCopy[i]
                            );


                        if (
                            distance <
                            nearestDistance
                        ) {

                            nearestDistance =
                                distance;


                            nearestIndex =
                                i;

                        }

                    }


                    current =
                        unlockedCopy.splice(
                            nearestIndex,
                            1
                        )[0];


                    result.push(
                        current
                    );

                }


                // 잠긴 장소는 기존 위치 유지
                const finalRoute =
                    new Array(
                        places.length
                    ).fill(null);


                places.forEach(
                    (p, index) => {

                        if (
                            p.isLocked
                        ) {

                            finalRoute[index] =
                                p;

                        }

                    }
                );


                let resultIndex =
                    0;


                for (
                    let i = 0;
                    i < finalRoute.length;
                    i++
                ) {

                    if (
                        finalRoute[i] === null
                    ) {

                        finalRoute[i] =
                            result[
                                resultIndex++
                            ];

                    }

                }


                currentTrip.places =
                    finalRoute;


                await saveCurrentTrip();


                renderPlaces();


                alert(
                    '경로를 최적화했습니다!'
                );

            }
            catch (error) {

                console.error(
                    '경로 최적화 실패:',
                    error
                );


                alert(
                    '경로 최적화 중 오류가 발생했습니다.'
                );

            }
            finally {

                isOptimizing =
                    false;


                if (optimizeBtn) {

                    optimizeBtn.disabled =
                        false;

                }

            }

        }


        function calculateDistance(
            a,
            b
        ) {

            const lat1 =
                Number(a.lat);


            const lng1 =
                Number(a.lng);


            const lat2 =
                Number(b.lat);


            const lng2 =
                Number(b.lng);


            if (
                !Number.isFinite(lat1) ||
                !Number.isFinite(lat2)
            ) {

                return Infinity;

            }


            const R =
                6371;


            const dLat =
                toRad(
                    lat2 - lat1
                );


            const dLng =
                toRad(
                    lng2 - lng1
                );


            const x =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +
                Math.cos(
                    toRad(lat1)
                ) *
                Math.cos(
                    toRad(lat2)
                ) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);


            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                )
            );

        }


        function toRad(value) {

            return (
                value *
                Math.PI /
                180
            );

        }


        // =====================================================
        // 초기 장소 렌더링
        // =====================================================

        renderPlaces();


        console.log(
            '===== 상세 페이지 초기화 완료 ====='
        );

    }


    // =========================================================
    // HTML escape
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                'div'
            );


        div.textContent =
            value ?? '';


        return div.innerHTML;

    }

});
    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    console.log('페이지 확인:', {
        isDetailPage,
        isAddPage,
        isIndexPage
    });


    // =========================================================
    // 페이지 실행
    // =========================================================

    if (isDetailPage) {
        initDetailPage();
    }
    else if (isAddPage) {
        initAddPage();
    }
    else if (isIndexPage) {
        initIndexPage();
    }



    // =========================================================
    // Firestore에서 여행 전체 불러오기
    // =========================================================

    async function loadTrips() {

        try {

            const snapshot = await db
                .collection('trips')
                .get();

            trips = snapshot.docs.map(doc => {

                const data = doc.data();

                return {
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
                        Array.isArray(data.places)
                            ? data.places
                            : []
                };

            });

            console.log('Firestore 여행 데이터:', trips);

            return trips;

        }
        catch (error) {

            console.error(
                'Firestore 불러오기 실패:',
                error
            );

            alert(
                'Firestore에서 여행 정보를 불러오지 못했습니다.'
            );

            trips = [];

            return [];

        }

    }



    // =========================================================
    // 여행 하나 저장
    // =========================================================

    async function saveTrip(trip) {

        if (!trip) {
            console.error('저장할 여행이 없습니다.');
            return false;
        }

        try {

            const id = String(trip.id);

            await db
                .collection('trips')
                .doc(id)
                .set({

                    id: trip.id,

                    destination:
                        trip.destination || '',

                    startDate:
                        trip.startDate || '',

                    endDate:
                        trip.endDate || '',

                    activity:
                        trip.activity || '',

                    places:
                        Array.isArray(trip.places)
                            ? trip.places
                            : []

                }, {
                    merge: true
                });

            console.log(
                '여행 저장 완료:',
                id
            );

            return true;

        }
        catch (error) {

            console.error(
                '여행 저장 실패:',
                error
            );

            alert(
                '여행 저장에 실패했습니다.'
            );

            return false;

        }

    }



    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList =
            document.getElementById('trip-list');

        const calendarView =
            document.getElementById('calendar-view');

        const emptyState =
            document.getElementById('empty-state');

        const totalTripsEl =
            document.getElementById('total-trips');

        const upcomingTripsEl =
            document.getElementById('upcoming-trips');

        const pastTripsEl =
            document.getElementById('past-trips');

        const tabBtns =
            document.querySelectorAll('.tab-btn');

        const viewBtns =
            document.querySelectorAll('.view-btn');


        // -----------------------------------------
        // 검색
        // -----------------------------------------

        const searchNameInput =
            document.getElementById('search-name');

        const searchYearSelect =
            document.getElementById('search-year');

        const searchMonthSelect =
            document.getElementById('search-month');

        const searchBtn =
            document.getElementById('search-btn');


        // -----------------------------------------
        // 연도
        // -----------------------------------------

        if (searchYearSelect) {

            const currentYear =
                new Date().getFullYear();

            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {

                const option =
                    document.createElement('option');

                option.value = year;
                option.textContent = `${year}년`;

                searchYearSelect.appendChild(option);

            }

        }


        // -----------------------------------------
        // 초기 로딩
        // -----------------------------------------

        loadTrips().then(() => {

            renderTrips();
            updateStats();

        });


        // -----------------------------------------
        // 탭
        // -----------------------------------------

        tabBtns.forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    tabBtns.forEach(b =>
                        b.classList.remove('active')
                    );

                    btn.classList.add('active');

                    currentTab =
                        btn.dataset.tab;

                    renderTrips();

                }
            );

        });


        // -----------------------------------------
        // 보기 방식
        // -----------------------------------------

        viewBtns.forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    const title =
                        btn.getAttribute('title') || '';

                    if (
                        title.includes('리스트')
                    ) {

                        currentView = 'list';

                        if (tripList)
                            tripList.style.display = 'flex';

                        if (calendarView)
                            calendarView.style.display = 'none';

                        if (viewBtns[0])
                            viewBtns[0].classList.add('active');

                        if (viewBtns[1])
                            viewBtns[1].classList.remove('active');

                        renderTrips();

                    }
                    else {

                        currentView = 'calendar';

                        if (tripList)
                            tripList.style.display = 'none';

                        if (calendarView)
                            calendarView.style.display = 'flex';

                        if (viewBtns[0])
                            viewBtns[0].classList.remove('active');

                        if (viewBtns[1])
                            viewBtns[1].classList.add('active');

                        renderCalendar();

                    }

                }
            );

        });


        // -----------------------------------------
        // 검색
        // -----------------------------------------

        if (searchBtn) {

            searchBtn.addEventListener(
                'click',
                performSearch
            );

        }

        if (searchNameInput) {

            searchNameInput.addEventListener(
                'keypress',
                e => {

                    if (e.key === 'Enter') {
                        performSearch();
                    }

                }
            );

        }


        function performSearch() {

            const term =
                searchNameInput
                    ? searchNameInput.value
                        .trim()
                        .toLowerCase()
                    : '';

            const year =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';

            const month =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filtered =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate
                        );

                    const nameMatch =
                        (t.destination || '')
                            .toLowerCase()
                            .includes(term);

                    const yearMatch =
                        !year ||
                        String(
                            date.getFullYear()
                        ) === String(year);

                    const monthMatch =
                        !month ||
                        String(
                            date.getMonth() + 1
                        ) === String(month);

                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filtered);

        }



        // =====================================================
        // 여행 카드
        // =====================================================

        function renderTrips(
            tripsToRender = trips
        ) {

            if (!tripList) return;


            tripList
                .querySelectorAll('.trip-card')
                .forEach(card =>
                    card.remove()
                );


            const today =
                new Date();

            today.setHours(
                0, 0, 0, 0
            );


            let filtered =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate
                        );

                    start.setHours(
                        0, 0, 0, 0
                    );

                    if (
                        currentTab === 'upcoming'
                    ) {

                        return start >= today;

                    }

                    return start < today;

                });


            filtered.sort(
                (a, b) =>
                    new Date(a.startDate) -
                    new Date(b.startDate)
            );


            if (
                currentTab === 'past'
            ) {

                filtered.reverse();

            }


            if (
                filtered.length === 0
            ) {

                if (emptyState)
                    emptyState.style.display = 'flex';

                return;

            }


            if (emptyState)
                emptyState.style.display = 'none';


            filtered.forEach(t => {

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
                    async e => {

                        e.stopPropagation();

                        await deleteTrip(
                            t.id
                        );

                    }
                );


                // 카드 클릭
                card.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `trip_detail.html?id=${encodeURIComponent(String(t.id))}`;

                    }
                );


                tripList.appendChild(card);

            });

        }



        // =====================================================
        // 삭제
        // =====================================================

        async function deleteTrip(id) {

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


                trips =
                    trips.filter(
                        t =>
                            String(t.id) !==
                            String(id)
                    );


                renderTrips();
                updateStats();


            }
            catch (error) {

                console.error(
                    '삭제 실패:',
                    error
                );

                alert(
                    '여행 삭제에 실패했습니다.'
                );

            }

        }



        // =====================================================
        // 통계
        // =====================================================

        function updateStats() {

            const today =
                new Date();

            today.setHours(
                0, 0, 0, 0
            );


            const upcoming =
                trips.filter(t =>
                    new Date(t.startDate) >= today
                ).length;


            const past =
                trips.filter(t =>
                    new Date(t.startDate) < today
                ).length;


            if (totalTripsEl)
                totalTripsEl.textContent =
                    trips.length;

            if (upcomingTripsEl)
                upcomingTripsEl.textContent =
                    upcoming;

            if (pastTripsEl)
                pastTripsEl.textContent =
                    past;

        }



        // =====================================================
        // 캘린더
        // =====================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );

            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid) return;


            grid.innerHTML = '';


            const year =
                currentCalendarDate.getFullYear();

            const month =
                currentCalendarDate.getMonth();


            if (monthDisplay) {

                monthDisplay.textContent =
                    `${year}년 ${month + 1}월`;

            }


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            const daysInMonth =
                lastDay.getDate();


            const startDay =
                firstDay.getDay();


            for (
                let i = 0;
                i < startDay;
                i++
            ) {

                const empty =
                    document.createElement('div');

                empty.className =
                    'calendar-day empty';

                grid.appendChild(empty);

            }


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

                number.textContent =
                    day;


                div.appendChild(number);


                const dateStr =
                    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t =>
                        dateStr >= t.startDate &&
                        dateStr <= t.endDate
                    );


                dayTrips.forEach(t => {

                    const label =
                        document.createElement('div');

                    label.className =
                        'trip-label';

                    label.textContent =
                        t.destination;

                    div.appendChild(label);

                });


                grid.appendChild(div);

            }

        }


        const prev =
            document.getElementById(
                'prev-month'
            );

        const next =
            document.getElementById(
                'next-month'
            );


        if (prev) {

            prev.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1
                    );

                    renderCalendar();

                }
            );

        }


        if (next) {

            next.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1
                    );

                    renderCalendar();

                }
            );

        }

    }



    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById(
                'add-btn'
            );

        if (!addBtn) return;


        const destination =
            document.getElementById(
                'destination'
            );

        const startDate =
            document.getElementById(
                'start-date'
            );

        const endDate =
            document.getElementById(
                'end-date'
            );

        const activity =
            document.getElementById(
                'activity'
            );


        addBtn.addEventListener(
            'click',
            async () => {

                const destinationValue =
                    destination.value.trim();

                const startValue =
                    startDate.value;

                const endValue =
                    endDate.value;

                const activityValue =
                    activity
                        ? activity.value.trim()
                        : '';


                if (
                    !destinationValue ||
                    !startValue ||
                    !endValue
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;

                }


                if (
                    endValue < startValue
                ) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;

                }


                const id =
                    String(Date.now());


                const newTrip = {

                    id,

                    destination:
                        destinationValue,

                    startDate:
                        startValue,

                    endDate:
                        endValue,

                    activity:
                        activityValue,

                    places: []

                };


                const success =
                    await saveTrip(
                        newTrip
                    );


                if (success) {

                    window.location.href =
                        'index.html';

                }

            }
        );

    }



    // =========================================================
    // ★ DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        console.log(
            '===== 상세 페이지 시작 ====='
        );


        // -----------------------------------------
        // Leaflet 확인
        // -----------------------------------------

        if (
            typeof L === 'undefined'
        ) {

            console.error(
                'Leaflet이 로드되지 않았습니다.'
            );

            alert(
                '지도 라이브러리를 불러오지 못했습니다.'
            );

            return;

        }


        // -----------------------------------------
        // URL에서 ID 가져오기
        // -----------------------------------------

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            params.get('id');


        console.log(
            'URL 여행 ID:',
            tripId
        );


        if (!tripId) {

            alert(
                '여행 ID가 없습니다.'
            );

            window.location.href =
                'index.html';

            return;

        }


        // -----------------------------------------
        // Firestore 직접 조회
        // -----------------------------------------
        //
        // ★ 여기서 전체 trips를 불러오는 것보다
        // 해당 문서 하나만 가져오는 게 훨씬 안전함.
        //

        try {

            const doc =
                await db
                    .collection('trips')
                    .doc(String(tripId))
                    .get();


            if (!doc.exists) {

                console.error(
                    '여행 문서 없음:',
                    tripId
                );

                alert(
                    '여행 정보를 찾을 수 없습니다.'
                );

                window.location.href =
                    'index.html';

                return;

            }


            const data =
                doc.data();


            currentTrip = {

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
                    Array.isArray(data.places)
                        ? data.places
                        : []

            };


            console.log(
                '상세 여행 데이터:',
                currentTrip
            );


        }
        catch (error) {

            console.error(
                '여행 조회 실패:',
                error
            );

            alert(
                '여행 정보를 불러오지 못했습니다.'
            );

            return;

        }



        // -----------------------------------------
        // HTML 요소
        // -----------------------------------------

        const title =
            document.getElementById(
                'trip-title'
            );

        const dates =
            document.getElementById(
                'trip-dates'
            );

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

        const mapElement =
            document.getElementById(
                'map'
            );


        // -----------------------------------------
        // 제목
        // -----------------------------------------

        if (title) {

            title.textContent =
                currentTrip.destination;

        }


        if (dates) {

            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

        }



        // =====================================================
        // ★★★ MAP 초기화 ★★★
        // =====================================================

        console.log(
            '지도 초기화 시작'
        );


        if (!mapElement) {

            console.error(
                '#map 요소가 없습니다.'
            );

            alert(
                '지도 영역을 찾을 수 없습니다.'
            );

            return;

        }


        // 지도 높이 확인
        console.log(
            '지도 크기:',
            mapElement.offsetWidth,
            mapElement.offsetHeight
        );


        const map =
            L.map(
                mapElement
            ).setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {

                maxZoom: 19,

                attribution:
                    '&copy; OpenStreetMap contributors'

            }
        ).addTo(map);


        console.log(
            'Leaflet 지도 생성 완료'
        );


        // 지도 크기 재계산
        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );



        // =====================================================
        // 장소 렌더링
        // =====================================================

        function renderPlaces() {

            console.log(
                '장소 렌더링:',
                currentTrip.places
            );


            placesList.innerHTML = '';


            // 마커/선 제거
            map.eachLayer(
                layer => {

                    if (
                        layer instanceof L.Marker ||
                        layer instanceof L.Polyline
                    ) {

                        map.removeLayer(layer);

                    }

                }
            );


            if (
                !currentTrip.places ||
                currentTrip.places.length === 0
            ) {

                placesList.innerHTML = `

                    <div class="empty-places">

                        <p>
                            방문할 장소를 추가해보세요!
                        </p>

                    </div>

                `;

                return;

            }


            const latlngs = [];


            currentTrip.places.forEach(
                (place, index) => {

                    // -------------------------------
                    // 목록
                    // -------------------------------

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'place-item' +
                        (
                            place.isLocked
                                ? ' locked'
                                : ''
                        );


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
                            class="lock-btn ${
                                place.isLocked
                                    ? 'active'
                                    : ''
                            }"
                        >
                            <i class="fa-solid ${
                                place.isLocked
                                    ? 'fa-lock'
                                    : 'fa-lock-open'
                            }"></i>
                        </button>

                        <button
                            class="remove-place-btn"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    `;


                    // 잠금
                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    lockBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();

                            place.isLocked =
                                !place.isLocked;

                            await saveCurrentTrip();

                            renderPlaces();

                        }
                    );


                    // 삭제
                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    removeBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();

                            if (
                                !confirm(
                                    `"${place.name}" 장소를 삭제할까요?`
                                )
                            ) {
                                return;
                            }


                            currentTrip.places =
                                currentTrip.places.filter(
                                    p =>
                                        String(p.id) !==
                                        String(place.id)
                                );


                            await saveCurrentTrip();

                            renderPlaces();

                        }
                    );


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

                                await updateOrder();

                            }
                        );

                    }


                    placesList.appendChild(item);


                    // -------------------------------
                    // 지도 마커
                    // -------------------------------

                    const lat =
                        Number(place.lat);

                    const lng =
                        Number(place.lng);


                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                    ) {

                        L.marker(
                            [lat, lng]
                        )
                            .addTo(map)
                            .bindPopup(
                                `${index + 1}. ${escapeHtml(place.name)}`
                            );


                        latlngs.push(
                            [lat, lng]
                        );

                    }

                }
            );


            // -------------------------------
            // 경로
            // -------------------------------

            if (
                latlngs.length > 1
            ) {

                L.polyline(
                    latlngs
                ).addTo(map);


                map.fitBounds(
                    latlngs,
                    {
                        padding: [40, 40]
                    }
                );

            }
            else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    14
                );

            }

        }



        // =====================================================
        // 현재 여행 저장
        // =====================================================

        async function saveCurrentTrip() {

            return await saveTrip(
                currentTrip
            );

        }



        // =====================================================
        // 장소 추가
        // =====================================================

        async function addPlace() {

            const name =
                placeInput.value.trim();


            if (!name) {

                alert(
                    '장소를 입력해주세요.'
                );

                return;

            }


            addPlaceBtn.disabled =
                true;


            try {

                console.log(
                    '장소 검색:',
                    name
                );


                const url =
                    'https://nominatim.openstreetmap.org/search' +
                    '?format=json' +
                    '&limit=1' +
                    '&q=' +
                    encodeURIComponent(name);


                const response =
                    await fetch(
                        url,
                        {
                            headers: {
                                'Accept':
                                    'application/json'
                            }
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }


                const data =
                    await response.json();


                console.log(
                    '검색 결과:',
                    data
                );


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

                    id:
                        String(Date.now()),

                    name,

                    lat:
                        Number(result.lat),

                    lng:
                        Number(result.lon),

                    isLocked:
                        false

                };


                currentTrip.places.push(
                    newPlace
                );


                const success =
                    await saveCurrentTrip();


                if (!success) {

                    // 저장 실패하면 되돌림
                    currentTrip.places.pop();

                    return;

                }


                placeInput.value = '';

                renderPlaces();


            }
            catch (error) {

                console.error(
                    '장소 추가 오류:',
                    error
                );

                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            }
            finally {

                addPlaceBtn.disabled =
                    false;

            }

        }


        if (addPlaceBtn) {

            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        if (placeInput) {

            placeInput.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();

                        addPlace();

                    }

                }
            );

        }



        // =====================================================
        // 드래그 정렬
        // =====================================================

        placesList.addEventListener(
            'dragover',
            e => {

                e.preventDefault();


                const dragging =
                    placesList.querySelector(
                        '.dragging'
                    );


                if (!dragging) return;


                const after =
                    getDragAfterElement(
                        placesList,
                        e.clientY
                    );


                if (!after) {

                    placesList.appendChild(
                        dragging
                    );

                }
                else {

                    placesList.insertBefore(
                        dragging,
                        after
                    );

                }

            }
        );


        function getDragAfterElement(
            container,
            y
        ) {

            const elements =
                [
                    ...container.querySelectorAll(
                        '.place-item:not(.dragging)'
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
                        offset > closest.offset
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



        async function updateOrder() {

            const items =
                placesList.querySelectorAll(
                    '.place-item'
                );


            const ids =
                [...items].map(
                    item =>
                        String(
                            item.dataset.id
                        )
                );


            const reordered = [];


            ids.forEach(id => {

                const found =
                    currentTrip.places.find(
                        p =>
                            String(p.id) === id
                    );


                if (found) {

                    reordered.push(
                        found
                    );

                }

            });


            if (
                reordered.length ===
                currentTrip.places.length
            ) {

                currentTrip.places =
                    reordered;

                await saveCurrentTrip();

                renderPlaces();

            }

        }



        // =====================================================
        // 경로 최적화
        // =====================================================

        if (optimizeBtn) {

            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        async function optimizeRoute() {

            const places =
                currentTrip.places;


            if (
                !places ||
                places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );

                return;

            }


            const unlocked =
                places.filter(
                    p => !p.isLocked
                );


            if (
                unlocked.length < 2
            ) {

                alert(
                    '잠금 해제된 장소가 2개 이상 필요합니다.'
                );

                return;

            }


            // 가장 단순하고 안정적인 최근접 이웃 방식
            const locked =
                places.filter(
                    p => p.isLocked
                );


            const unlockedCopy =
                [...unlocked];


            const result = [];


            // 첫 번째 장소
            let current =
                unlockedCopy.shift();


            result.push(current);


            while (
                unlockedCopy.length > 0
            ) {

                let nearestIndex = 0;
                let nearestDistance =
                    Infinity;


                for (
                    let i = 0;
                    i < unlockedCopy.length;
                    i++
                ) {

                    const distance =
                        calculateDistance(
                            current,
                            unlockedCopy[i]
                        );


                    if (
                        distance <
                        nearestDistance
                    ) {

                        nearestDistance =
                            distance;

                        nearestIndex =
                            i;

                    }

                }


                current =
                    unlockedCopy.splice(
                        nearestIndex,
                        1
                    )[0];


                result.push(
                    current
                );

            }


            // 잠긴 장소는 기존 위치 유지
            const finalRoute =
                new Array(
                    places.length
                ).fill(null);


            places.forEach(
                (p, index) => {

                    if (p.isLocked) {

                        finalRoute[index] =
                            p;

                    }

                }
            );


            let resultIndex = 0;


            for (
                let i = 0;
                i < finalRoute.length;
                i++
            ) {

                if (
                    finalRoute[i] === null
                ) {

                    finalRoute[i] =
                        result[resultIndex++];

                }

            }


            currentTrip.places =
                finalRoute;


            await saveCurrentTrip();

            renderPlaces();


            alert(
                '경로를 최적화했습니다!'
            );

        }



        function calculateDistance(
            a,
            b
        ) {

            const lat1 =
                Number(a.lat);

            const lng1 =
                Number(a.lng);

            const lat2 =
                Number(b.lat);

            const lng2 =
                Number(b.lng);


            if (
                !Number.isFinite(lat1) ||
                !Number.isFinite(lat2)
            ) {

                return Infinity;

            }


            const R = 6371;


            const dLat =
                toRad(lat2 - lat1);

            const dLng =
                toRad(lng2 - lng1);


            const x =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);


            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                )
            );

        }


        function toRad(value) {

            return value *
                Math.PI /
                180;

        }



        // =====================================================
        // ★ 마지막으로 장소 렌더링
        // =====================================================

        renderPlaces();


        console.log(
            '===== 상세 페이지 초기화 완료 ====='
        );

    }



    // =========================================================
    // HTML escape
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                'div'
            );

        div.textContent =
            value ?? '';

        return div.innerHTML;

    }

});
    let trips = [];
    let currentTab = 'upcoming';
    let currentView = 'list';
    let currentCalendarDate = new Date();
    let currentTrip = null;


    // =========================================================
    // 페이지 확인
    // =========================================================

    const isDetailPage =
        document.getElementById('map') &&
        document.getElementById('places-list');

    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    console.log('페이지 확인:', {
        isDetailPage,
        isAddPage,
        isIndexPage
    });


    // =========================================================
    // 페이지 실행
    // =========================================================

    if (isDetailPage) {
        initDetailPage();
    }
    else if (isAddPage) {
        initAddPage();
    }
    else if (isIndexPage) {
        initIndexPage();
    }


    // =========================================================
    // Firestore에서 여행 전체 불러오기
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


                    return {

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
                            Array.isArray(data.places)
                                ? data.places
                                : []

                    };

                });


            console.log(
                'Firestore 여행 데이터:',
                trips
            );


            return trips;

        }
        catch (error) {

            console.error(
                'Firestore 불러오기 실패:',
                error
            );


            alert(
                'Firestore에서 여행 정보를 불러오지 못했습니다.'
            );


            trips = [];


            return [];

        }

    }


    // =========================================================
    // 여행 하나 저장
    // =========================================================

    async function saveTrip(trip) {

        if (!trip) {

            console.error(
                '저장할 여행이 없습니다.'
            );

            return false;

        }


        try {

            const id =
                String(trip.id);


            await db
                .collection('trips')
                .doc(id)
                .set({

                    id:
                        trip.id,

                    destination:
                        trip.destination || '',

                    startDate:
                        trip.startDate || '',

                    endDate:
                        trip.endDate || '',

                    activity:
                        trip.activity || '',

                    places:
                        Array.isArray(trip.places)
                            ? trip.places
                            : []

                }, {

                    merge: true

                });


            console.log(
                '여행 저장 완료:',
                id
            );


            return true;

        }
        catch (error) {

            console.error(
                '여행 저장 실패:',
                error
            );


            alert(
                '여행 저장에 실패했습니다.'
            );


            return false;

        }

    }


    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList =
            document.getElementById(
                'trip-list'
            );

        const calendarView =
            document.getElementById(
                'calendar-view'
            );

        const emptyState =
            document.getElementById(
                'empty-state'
            );

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

        const tabBtns =
            document.querySelectorAll(
                '.tab-btn'
            );

        const viewBtns =
            document.querySelectorAll(
                '.view-btn'
            );


        // =====================================================
        // 검색
        // =====================================================

        const searchNameInput =
            document.getElementById(
                'search-name'
            );

        const searchYearSelect =
            document.getElementById(
                'search-year'
            );

        const searchMonthSelect =
            document.getElementById(
                'search-month'
            );

        const searchBtn =
            document.getElementById(
                'search-btn'
            );


        // =====================================================
        // 연도
        // =====================================================

        if (
            searchYearSelect &&
            searchYearSelect.dataset.initialized !== 'true'
        ) {

            searchYearSelect.dataset.initialized =
                'true';


            const currentYear =
                new Date().getFullYear();


            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    year;


                option.textContent =
                    `${year}년`;


                searchYearSelect.appendChild(
                    option
                );

            }

        }


        // =====================================================
        // 초기 로딩
        // =====================================================

        loadTrips().then(() => {

            renderTrips();

            updateStats();

        });


        // =====================================================
        // 탭
        // =====================================================

        tabBtns.forEach(btn => {

            if (
                btn.dataset.listenerAdded === 'true'
            ) {
                return;
            }


            btn.dataset.listenerAdded =
                'true';


            btn.addEventListener(
                'click',
                () => {

                    tabBtns.forEach(b =>
                        b.classList.remove(
                            'active'
                        )
                    );


                    btn.classList.add(
                        'active'
                    );


                    currentTab =
                        btn.dataset.tab;


                    renderTrips();

                }
            );

        });


        // =====================================================
        // 보기 방식
        // =====================================================

        viewBtns.forEach(btn => {

            if (
                btn.dataset.listenerAdded === 'true'
            ) {
                return;
            }


            btn.dataset.listenerAdded =
                'true';


            btn.addEventListener(
                'click',
                () => {

                    const title =
                        btn.getAttribute(
                            'title'
                        ) || '';


                    if (
                        title.includes('리스트')
                    ) {

                        currentView =
                            'list';


                        if (tripList) {

                            tripList.style.display =
                                'flex';

                        }


                        if (calendarView) {

                            calendarView.style.display =
                                'none';

                        }


                        if (viewBtns[0]) {

                            viewBtns[0].classList.add(
                                'active'
                            );

                        }


                        if (viewBtns[1]) {

                            viewBtns[1].classList.remove(
                                'active'
                            );

                        }


                        renderTrips();

                    }
                    else {

                        currentView =
                            'calendar';


                        if (tripList) {

                            tripList.style.display =
                                'none';

                        }


                        if (calendarView) {

                            calendarView.style.display =
                                'flex';

                        }


                        if (viewBtns[0]) {

                            viewBtns[0].classList.remove(
                                'active'
                            );

                        }


                        if (viewBtns[1]) {

                            viewBtns[1].classList.add(
                                'active'
                            );

                        }


                        renderCalendar();

                    }

                }
            );

        });


        // =====================================================
        // 검색 버튼
        // =====================================================

        if (
            searchBtn &&
            searchBtn.dataset.listenerAdded !== 'true'
        ) {

            searchBtn.dataset.listenerAdded =
                'true';


            searchBtn.addEventListener(
                'click',
                performSearch
            );

        }


        // =====================================================
        // 검색 Enter
        // =====================================================

        if (
            searchNameInput &&
            searchNameInput.dataset.listenerAdded !== 'true'
        ) {

            searchNameInput.dataset.listenerAdded =
                'true';


            searchNameInput.addEventListener(
                'keypress',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        performSearch();

                    }

                }
            );

        }


        // =====================================================
        // 검색 실행
        // =====================================================

        function performSearch() {

            const term =
                searchNameInput
                    ? searchNameInput.value
                        .trim()
                        .toLowerCase()
                    : '';


            const year =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';


            const month =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filtered =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate
                        );


                    const nameMatch =
                        (t.destination || '')
                            .toLowerCase()
                            .includes(term);


                    const yearMatch =
                        !year ||
                        String(
                            date.getFullYear()
                        ) === String(year);


                    const monthMatch =
                        !month ||
                        String(
                            date.getMonth() + 1
                        ) === String(month);


                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filtered);

        }


        // =====================================================
        // 여행 카드
        // =====================================================

        function renderTrips(
            tripsToRender = trips
        ) {

            if (!tripList) {
                return;
            }


            tripList
                .querySelectorAll(
                    '.trip-card'
                )
                .forEach(card =>
                    card.remove()
                );


            const today =
                new Date();


            today.setHours(
                0,
                0,
                0,
                0
            );


            let filtered =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate
                        );


                    start.setHours(
                        0,
                        0,
                        0,
                        0
                    );


                    if (
                        currentTab === 'upcoming'
                    ) {

                        return start >= today;

                    }


                    return start < today;

                });


            filtered.sort(
                (a, b) =>
                    new Date(a.startDate) -
                    new Date(b.startDate)
            );


            if (
                currentTab === 'past'
            ) {

                filtered.reverse();

            }


            if (
                filtered.length === 0
            ) {

                if (emptyState) {

                    emptyState.style.display =
                        'flex';

                }


                return;

            }


            if (emptyState) {

                emptyState.style.display =
                    'none';

            }


            filtered.forEach(t => {

                const card =
                    document.createElement(
                        'div'
                    );


                card.className =
                    'trip-card';


                card.innerHTML = `

                    <div class="trip-info">

                        <h3>
                            ${escapeHtml(
                                t.destination
                            )}
                        </h3>

                        <p>
                            ${escapeHtml(
                                t.startDate
                            )}
                            ~
                            ${escapeHtml(
                                t.endDate
                            )}
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


                if (deleteBtn) {

                    deleteBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();


                            await deleteTrip(
                                t.id
                            );

                        }
                    );

                }


                card.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `trip_detail.html?id=${encodeURIComponent(
                                String(t.id)
                            )}`;

                    }
                );


                tripList.appendChild(
                    card
                );

            });

        }


        // =====================================================
        // 삭제
        // =====================================================

        async function deleteTrip(id) {

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


                trips =
                    trips.filter(
                        t =>
                            String(t.id) !==
                            String(id)
                    );


                renderTrips();

                updateStats();

            }
            catch (error) {

                console.error(
                    '삭제 실패:',
                    error
                );


                alert(
                    '여행 삭제에 실패했습니다.'
                );

            }

        }


        // =====================================================
        // 통계
        // =====================================================

        function updateStats() {

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
                            t.startDate
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
                            t.startDate
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


        // =====================================================
        // 캘린더
        // =====================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );


            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid) {
                return;
            }


            grid.innerHTML =
                '';


            const year =
                currentCalendarDate.getFullYear();


            const month =
                currentCalendarDate.getMonth();


            if (monthDisplay) {

                monthDisplay.textContent =
                    `${year}년 ${month + 1}월`;

            }


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            const daysInMonth =
                lastDay.getDate();


            const startDay =
                firstDay.getDay();


            for (
                let i = 0;
                i < startDay;
                i++
            ) {

                const empty =
                    document.createElement(
                        'div'
                    );


                empty.className =
                    'calendar-day empty';


                grid.appendChild(
                    empty
                );

            }


            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {

                const div =
                    document.createElement(
                        'div'
                    );


                div.className =
                    'calendar-day';


                const number =
                    document.createElement(
                        'span'
                    );


                number.textContent =
                    day;


                div.appendChild(
                    number
                );


                const dateStr =
                    `${year}-${String(
                        month + 1
                    ).padStart(2, '0')}-${String(
                        day
                    ).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t =>
                        dateStr >= t.startDate &&
                        dateStr <= t.endDate
                    );


                dayTrips.forEach(t => {

                    const label =
                        document.createElement(
                            'div'
                        );


                    label.className =
                        'trip-label';


                    label.textContent =
                        t.destination;


                    div.appendChild(
                        label
                    );

                });


                grid.appendChild(
                    div
                );

            }

        }


        const prev =
            document.getElementById(
                'prev-month'
            );


        const next =
            document.getElementById(
                'next-month'
            );


        if (
            prev &&
            prev.dataset.listenerAdded !== 'true'
        ) {

            prev.dataset.listenerAdded =
                'true';


            prev.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1
                    );


                    renderCalendar();

                }
            );

        }


        if (
            next &&
            next.dataset.listenerAdded !== 'true'
        ) {

            next.dataset.listenerAdded =
                'true';


            next.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1
                    );


                    renderCalendar();

                }
            );

        }

    }


    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById(
                'add-btn'
            );


        if (!addBtn) {
            return;
        }


        // -----------------------------------------------------
        // ★ 이미 이벤트가 등록되어 있으면 다시 등록하지 않음
        // -----------------------------------------------------

        if (
            addBtn.dataset.listenerAdded === 'true'
        ) {

            console.warn(
                '일정 추가 버튼 이벤트가 이미 등록되어 있습니다.'
            );

            return;

        }


        addBtn.dataset.listenerAdded =
            'true';


        const destination =
            document.getElementById(
                'destination'
            );


        const startDate =
            document.getElementById(
                'start-date'
            );


        const endDate =
            document.getElementById(
                'end-date'
            );


        const activity =
            document.getElementById(
                'activity'
            );


        // -----------------------------------------------------
        // ★ 중복 저장 방지용 상태
        // -----------------------------------------------------

        let isSaving =
            false;


        // -----------------------------------------------------
        // 일정 추가
        // -----------------------------------------------------

        addBtn.addEventListener(
            'click',
            async () => {

                // 이미 저장 중이면 아무것도 하지 않음
                if (isSaving) {

                    console.warn(
                        '이미 일정 저장 중입니다.'
                    );

                    return;

                }


                const destinationValue =
                    destination
                        ? destination.value.trim()
                        : '';


                const startValue =
                    startDate
                        ? startDate.value
                        : '';


                const endValue =
                    endDate
                        ? endDate.value
                        : '';


                const activityValue =
                    activity
                        ? activity.value.trim()
                        : '';


                // -------------------------------------------------
                // 필수값 확인
                // -------------------------------------------------

                if (
                    !destinationValue ||
                    !startValue ||
                    !endValue
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;

                }


                // -------------------------------------------------
                // 날짜 확인
                // -------------------------------------------------

                if (
                    endValue < startValue
                ) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;

                }


                // -------------------------------------------------
                // ★ 저장 시작
                // -------------------------------------------------

                isSaving =
                    true;


                addBtn.disabled =
                    true;


                const originalText =
                    addBtn.innerHTML;


                addBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    저장 중...
                `;


                try {

                    // -------------------------------------------------
                    // ID 생성
                    // -------------------------------------------------

                    const id =
                        String(
                            Date.now()
                        );


                    const newTrip = {

                        id,

                        destination:
                            destinationValue,

                        startDate:
                            startValue,

                        endDate:
                            endValue,

                        activity:
                            activityValue,

                        places:
                            []

                    };


                    console.log(
                        '새 여행 저장 시작:',
                        newTrip
                    );


                    // -------------------------------------------------
                    // ★ Firestore 한 번만 저장
                    // -------------------------------------------------

                    const success =
                        await saveTrip(
                            newTrip
                        );


                    if (success) {

                        console.log(
                            '새 여행 저장 성공:',
                            id
                        );


                        // 저장 성공 후에만 이동
                        window.location.href =
                            'index.html';


                        return;

                    }


                    // 저장 실패
                    isSaving =
                        false;


                    addBtn.disabled =
                        false;


                    addBtn.innerHTML =
                        originalText;

                }
                catch (error) {

                    console.error(
                        '일정 추가 실패:',
                        error
                    );


                    alert(
                        '일정을 추가하는 중 오류가 발생했습니다.'
                    );


                    isSaving =
                        false;


                    addBtn.disabled =
                        false;


                    addBtn.innerHTML =
                        originalText;

                }

            }
        );


        // =====================================================
        // Enter로 일정 추가
        // =====================================================

        const formInputs = [
            destination,
            startDate,
            endDate,
            activity
        ];


        formInputs.forEach(input => {

            if (!input) {
                return;
            }


            if (
                input.dataset.listenerAdded === 'true'
            ) {

                return;

            }


            input.dataset.listenerAdded =
                'true';


            input.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();


                        // 버튼의 click 이벤트 하나만 실행
                        if (!isSaving) {

                            addBtn.click();

                        }

                    }

                }
            );

        });

    }


    // =========================================================
    // DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        console.log(
            '===== 상세 페이지 시작 ====='
        );


        // =====================================================
        // Leaflet 확인
        // =====================================================

        if (
            typeof L === 'undefined'
        ) {

            console.error(
                'Leaflet이 로드되지 않았습니다.'
            );


            alert(
                '지도 라이브러리를 불러오지 못했습니다.'
            );


            return;

        }


        // =====================================================
        // URL ID
        // =====================================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            params.get('id');


        console.log(
            'URL 여행 ID:',
            tripId
        );


        if (!tripId) {

            alert(
                '여행 ID가 없습니다.'
            );


            window.location.href =
                'index.html';


            return;

        }


        // =====================================================
        // Firestore에서 여행 하나 조회
        // =====================================================

        try {

            const doc =
                await db
                    .collection('trips')
                    .doc(String(tripId))
                    .get();


            if (!doc.exists) {

                console.error(
                    '여행 문서 없음:',
                    tripId
                );


                alert(
                    '여행 정보를 찾을 수 없습니다.'
                );


                window.location.href =
                    'index.html';


                return;

            }


            const data =
                doc.data();


            currentTrip = {

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
                    Array.isArray(data.places)
                        ? data.places
                        : []

            };


            console.log(
                '상세 여행 데이터:',
                currentTrip
            );

        }
        catch (error) {

            console.error(
                '여행 조회 실패:',
                error
            );


            alert(
                '여행 정보를 불러오지 못했습니다.'
            );


            return;

        }


        // =====================================================
        // HTML 요소
        // =====================================================

        const title =
            document.getElementById(
                'trip-title'
            );


        const dates =
            document.getElementById(
                'trip-dates'
            );


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


        const mapElement =
            document.getElementById(
                'map'
            );


        // =====================================================
        // 제목 / 날짜
        // =====================================================

        if (title) {

            title.textContent =
                currentTrip.destination;

        }


        if (dates) {

            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

        }


        // =====================================================
        // 지도
        // =====================================================

        if (!mapElement) {

            console.error(
                '#map 요소가 없습니다.'
            );


            alert(
                '지도 영역을 찾을 수 없습니다.'
            );


            return;

        }


        const map =
            L.map(
                mapElement
            ).setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {

                maxZoom:
                    19,

                attribution:
                    '&copy; OpenStreetMap contributors'

            }
        ).addTo(
            map
        );


        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );


        // =====================================================
        // 장소 렌더링
        // =====================================================

        function renderPlaces() {

            if (!placesList) {
                return;
            }


            placesList.innerHTML =
                '';


            map.eachLayer(
                layer => {

                    if (
                        layer instanceof L.Marker ||
                        layer instanceof L.Polyline
                    ) {

                        map.removeLayer(
                            layer
                        );

                    }

                }
            );


            if (
                !currentTrip.places ||
                currentTrip.places.length === 0
            ) {

                placesList.innerHTML = `

                    <div class="empty-places">

                        <p>
                            방문할 장소를 추가해보세요!
                        </p>

                    </div>

                `;


                return;

            }


            const latlngs =
                [];


            currentTrip.places.forEach(
                (place, index) => {

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'place-item' +
                        (
                            place.isLocked
                                ? ' locked'
                                : ''
                        );


                    item.dataset.id =
                        String(
                            place.id
                        );


                    item.draggable =
                        !place.isLocked;


                    item.innerHTML = `

                        <span class="place-number">
                            ${index + 1}
                        </span>

                        <span class="place-name">
                            ${escapeHtml(
                                place.name
                            )}
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


                    // =================================================
                    // 잠금
                    // =================================================

                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    if (lockBtn) {

                        lockBtn.addEventListener(
                            'click',
                            async e => {

                                e.stopPropagation();


                                place.isLocked =
                                    !place.isLocked;


                                await saveCurrentTrip();


                                renderPlaces();

                            }
                        );

                    }


                    // =================================================
                    // 삭제
                    // =================================================

                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    if (removeBtn) {

                        removeBtn.addEventListener(
                            'click',
                            async e => {

                                e.stopPropagation();


                                if (
                                    !confirm(
                                        `"${place.name}" 장소를 삭제할까요?`
                                    )
                                ) {

                                    return;

                                }


                                currentTrip.places =
                                    currentTrip.places.filter(
                                        p =>
                                            String(p.id) !==
                                            String(place.id)
                                    );


                                await saveCurrentTrip();


                                renderPlaces();

                            }
                        );

                    }


                    // =================================================
                    // 드래그
                    // =================================================

                    if (
                        !place.isLocked
                    ) {

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


                    // =================================================
                    // 지도 마커
                    // =================================================

                    const lat =
                        Number(
                            place.lat
                        );


                    const lng =
                        Number(
                            place.lng
                        );


                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                    ) {

                        L.marker(
                            [lat, lng]
                        )
                            .addTo(map)
                            .bindPopup(
                                `${index + 1}. ${escapeHtml(
                                    place.name
                                )}`
                            );


                        latlngs.push(
                            [lat, lng]
                        );

                    }

                }
            );


            // =====================================================
            // 경로
            // =====================================================

            if (
                latlngs.length > 1
            ) {

                L.polyline(
                    latlngs
                ).addTo(
                    map
                );


                map.fitBounds(
                    latlngs,
                    {
                        padding: [
                            40,
                            40
                        ]
                    }
                );

            }
            else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    14
                );

            }

        }


        // =====================================================
        // 현재 여행 저장
        // =====================================================

        async function saveCurrentTrip() {

            return await saveTrip(
                currentTrip
            );

        }


        // =====================================================
        // 장소 추가
        // =====================================================

        let isAddingPlace =
            false;


        async function addPlace() {

            if (isAddingPlace) {
                return;
            }


            if (!placeInput) {
                return;
            }


            const name =
                placeInput.value.trim();


            if (!name) {

                alert(
                    '장소를 입력해주세요.'
                );


                return;

            }


            isAddingPlace =
                true;


            if (addPlaceBtn) {

                addPlaceBtn.disabled =
                    true;

            }


            try {

                const url =
                    'https://nominatim.openstreetmap.org/search' +
                    '?format=json' +
                    '&limit=1' +
                    '&q=' +
                    encodeURIComponent(name);


                const response =
                    await fetch(
                        url,
                        {

                            headers: {

                                Accept:
                                    'application/json'

                            }

                        }
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

                    id:
                        String(
                            Date.now()
                        ),

                    name,

                    lat:
                        Number(
                            result.lat
                        ),

                    lng:
                        Number(
                            result.lon
                        ),

                    isLocked:
                        false

                };


                currentTrip.places.push(
                    newPlace
                );


                const success =
                    await saveCurrentTrip();


                if (!success) {

                    currentTrip.places.pop();


                    return;

                }


                placeInput.value =
                    '';


                renderPlaces();

            }
            catch (error) {

                console.error(
                    '장소 추가 오류:',
                    error
                );


                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            }
            finally {

                isAddingPlace =
                    false;


                if (addPlaceBtn) {

                    addPlaceBtn.disabled =
                        false;

                }

            }

        }


        // =====================================================
        // 장소 추가 버튼
        // =====================================================

        if (
            addPlaceBtn &&
            addPlaceBtn.dataset.listenerAdded !== 'true'
        ) {

            addPlaceBtn.dataset.listenerAdded =
                'true';


            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        // =====================================================
        // 장소 Enter
        // =====================================================

        if (
            placeInput &&
            placeInput.dataset.listenerAdded !== 'true'
        ) {

            placeInput.dataset.listenerAdded =
                'true';


            placeInput.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();


                        addPlace();

                    }

                }
            );

        }


        // =====================================================
        // 드래그 정렬
        // =====================================================

        if (
            placesList &&
            placesList.dataset.listenerAdded !== 'true'
        ) {

            placesList.dataset.listenerAdded =
                'true';


            placesList.addEventListener(
                'dragover',
                e => {

                    e.preventDefault();


                    const dragging =
                        placesList.querySelector(
                            '.dragging'
                        );


                    if (!dragging) {
                        return;
                    }


                    const after =
                        getDragAfterElement(
                            placesList,
                            e.clientY
                        );


                    if (!after) {

                        placesList.appendChild(
                            dragging
                        );

                    }
                    else {

                        placesList.insertBefore(
                            dragging,
                            after
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
                        '.place-item:not(.dragging)'
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
                        offset > closest.offset
                    ) {

                        closest = {

                            offset,

                            element:
                                child

                        };

                    }

                }
            );


            return closest.element;

        }


        // =====================================================
        // 순서 업데이트
        // =====================================================

        async function updateOrder() {

            if (!placesList) {
                return;
            }


            const items =
                placesList.querySelectorAll(
                    '.place-item'
                );


            const ids =
                [...items].map(
                    item =>
                        String(
                            item.dataset.id
                        )
                );


            const reordered =
                [];


            ids.forEach(id => {

                const found =
                    currentTrip.places.find(
                        p =>
                            String(p.id) ===
                            id
                    );


                if (found) {

                    reordered.push(
                        found
                    );

                }

            });


            if (
                reordered.length ===
                currentTrip.places.length
            ) {

                currentTrip.places =
                    reordered;


                await saveCurrentTrip();


                renderPlaces();

            }

        }


        // =====================================================
        // 경로 최적화
        // =====================================================

        if (
            optimizeBtn &&
            optimizeBtn.dataset.listenerAdded !== 'true'
        ) {

            optimizeBtn.dataset.listenerAdded =
                'true';


            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        let isOptimizing =
            false;


        async function optimizeRoute() {

            if (isOptimizing) {
                return;
            }


            const places =
                currentTrip.places;


            if (
                !places ||
                places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );


                return;

            }


            const unlocked =
                places.filter(
                    p =>
                        !p.isLocked
                );


            if (
                unlocked.length < 2
            ) {

                alert(
                    '잠금 해제된 장소가 2개 이상 필요합니다.'
                );


                return;

            }


            isOptimizing =
                true;


            if (optimizeBtn) {

                optimizeBtn.disabled =
                    true;

            }


            try {

                const unlockedCopy =
                    [...unlocked];


                const result =
                    [];


                let current =
                    unlockedCopy.shift();


                result.push(
                    current
                );


                while (
                    unlockedCopy.length > 0
                ) {

                    let nearestIndex =
                        0;


                    let nearestDistance =
                        Infinity;


                    for (
                        let i = 0;
                        i < unlockedCopy.length;
                        i++
                    ) {

                        const distance =
                            calculateDistance(
                                current,
                                unlockedCopy[i]
                            );


                        if (
                            distance <
                            nearestDistance
                        ) {

                            nearestDistance =
                                distance;


                            nearestIndex =
                                i;

                        }

                    }


                    current =
                        unlockedCopy.splice(
                            nearestIndex,
                            1
                        )[0];


                    result.push(
                        current
                    );

                }


                // 잠긴 장소는 기존 위치 유지
                const finalRoute =
                    new Array(
                        places.length
                    ).fill(null);


                places.forEach(
                    (p, index) => {

                        if (
                            p.isLocked
                        ) {

                            finalRoute[index] =
                                p;

                        }

                    }
                );


                let resultIndex =
                    0;


                for (
                    let i = 0;
                    i < finalRoute.length;
                    i++
                ) {

                    if (
                        finalRoute[i] === null
                    ) {

                        finalRoute[i] =
                            result[
                                resultIndex++
                            ];

                    }

                }


                currentTrip.places =
                    finalRoute;


                await saveCurrentTrip();


                renderPlaces();


                alert(
                    '경로를 최적화했습니다!'
                );

            }
            catch (error) {

                console.error(
                    '경로 최적화 실패:',
                    error
                );


                alert(
                    '경로 최적화 중 오류가 발생했습니다.'
                );

            }
            finally {

                isOptimizing =
                    false;


                if (optimizeBtn) {

                    optimizeBtn.disabled =
                        false;

                }

            }

        }


        function calculateDistance(
            a,
            b
        ) {

            const lat1 =
                Number(a.lat);


            const lng1 =
                Number(a.lng);


            const lat2 =
                Number(b.lat);


            const lng2 =
                Number(b.lng);


            if (
                !Number.isFinite(lat1) ||
                !Number.isFinite(lat2)
            ) {

                return Infinity;

            }


            const R =
                6371;


            const dLat =
                toRad(
                    lat2 - lat1
                );


            const dLng =
                toRad(
                    lng2 - lng1
                );


            const x =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +
                Math.cos(
                    toRad(lat1)
                ) *
                Math.cos(
                    toRad(lat2)
                ) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);


            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                )
            );

        }


        function toRad(value) {

            return (
                value *
                Math.PI /
                180
            );

        }


        // =====================================================
        // 초기 장소 렌더링
        // =====================================================

        renderPlaces();


        console.log(
            '===== 상세 페이지 초기화 완료 ====='
        );

    }


    // =========================================================
    // HTML escape
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                'div'
            );


        div.textContent =
            value ?? '';


        return div.innerHTML;

    }

});
    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    console.log('페이지 확인:', {
        isDetailPage,
        isAddPage,
        isIndexPage
    });


    // =========================================================
    // 페이지 실행
    // =========================================================

    if (isDetailPage) {
        initDetailPage();
    }
    else if (isAddPage) {
        initAddPage();
    }
    else if (isIndexPage) {
        initIndexPage();
    }



    // =========================================================
    // Firestore에서 여행 전체 불러오기
    // =========================================================

    async function loadTrips() {

        try {

            const snapshot = await db
                .collection('trips')
                .get();

            trips = snapshot.docs.map(doc => {

                const data = doc.data();

                return {
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
                        Array.isArray(data.places)
                            ? data.places
                            : []
                };

            });

            console.log('Firestore 여행 데이터:', trips);

            return trips;

        }
        catch (error) {

            console.error(
                'Firestore 불러오기 실패:',
                error
            );

            alert(
                'Firestore에서 여행 정보를 불러오지 못했습니다.'
            );

            trips = [];

            return [];

        }

    }



    // =========================================================
    // 여행 하나 저장
    // =========================================================

    async function saveTrip(trip) {

        if (!trip) {
            console.error('저장할 여행이 없습니다.');
            return false;
        }

        try {

            const id = String(trip.id);

            await db
                .collection('trips')
                .doc(id)
                .set({

                    id: trip.id,

                    destination:
                        trip.destination || '',

                    startDate:
                        trip.startDate || '',

                    endDate:
                        trip.endDate || '',

                    activity:
                        trip.activity || '',

                    places:
                        Array.isArray(trip.places)
                            ? trip.places
                            : []

                }, {
                    merge: true
                });

            console.log(
                '여행 저장 완료:',
                id
            );

            return true;

        }
        catch (error) {

            console.error(
                '여행 저장 실패:',
                error
            );

            alert(
                '여행 저장에 실패했습니다.'
            );

            return false;

        }

    }



    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList =
            document.getElementById('trip-list');

        const calendarView =
            document.getElementById('calendar-view');

        const emptyState =
            document.getElementById('empty-state');

        const totalTripsEl =
            document.getElementById('total-trips');

        const upcomingTripsEl =
            document.getElementById('upcoming-trips');

        const pastTripsEl =
            document.getElementById('past-trips');

        const tabBtns =
            document.querySelectorAll('.tab-btn');

        const viewBtns =
            document.querySelectorAll('.view-btn');


        // -----------------------------------------
        // 검색
        // -----------------------------------------

        const searchNameInput =
            document.getElementById('search-name');

        const searchYearSelect =
            document.getElementById('search-year');

        const searchMonthSelect =
            document.getElementById('search-month');

        const searchBtn =
            document.getElementById('search-btn');


        // -----------------------------------------
        // 연도
        // -----------------------------------------

        if (searchYearSelect) {

            const currentYear =
                new Date().getFullYear();

            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {

                const option =
                    document.createElement('option');

                option.value = year;
                option.textContent = `${year}년`;

                searchYearSelect.appendChild(option);

            }

        }


        // -----------------------------------------
        // 초기 로딩
        // -----------------------------------------

        loadTrips().then(() => {

            renderTrips();
            updateStats();

        });


        // -----------------------------------------
        // 탭
        // -----------------------------------------

        tabBtns.forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    tabBtns.forEach(b =>
                        b.classList.remove('active')
                    );

                    btn.classList.add('active');

                    currentTab =
                        btn.dataset.tab;

                    renderTrips();

                }
            );

        });


        // -----------------------------------------
        // 보기 방식
        // -----------------------------------------

        viewBtns.forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    const title =
                        btn.getAttribute('title') || '';

                    if (
                        title.includes('리스트')
                    ) {

                        currentView = 'list';

                        if (tripList)
                            tripList.style.display = 'flex';

                        if (calendarView)
                            calendarView.style.display = 'none';

                        if (viewBtns[0])
                            viewBtns[0].classList.add('active');

                        if (viewBtns[1])
                            viewBtns[1].classList.remove('active');

                        renderTrips();

                    }
                    else {

                        currentView = 'calendar';

                        if (tripList)
                            tripList.style.display = 'none';

                        if (calendarView)
                            calendarView.style.display = 'flex';

                        if (viewBtns[0])
                            viewBtns[0].classList.remove('active');

                        if (viewBtns[1])
                            viewBtns[1].classList.add('active');

                        renderCalendar();

                    }

                }
            );

        });


        // -----------------------------------------
        // 검색
        // -----------------------------------------

        if (searchBtn) {

            searchBtn.addEventListener(
                'click',
                performSearch
            );

        }

        if (searchNameInput) {

            searchNameInput.addEventListener(
                'keypress',
                e => {

                    if (e.key === 'Enter') {
                        performSearch();
                    }

                }
            );

        }


        function performSearch() {

            const term =
                searchNameInput
                    ? searchNameInput.value
                        .trim()
                        .toLowerCase()
                    : '';

            const year =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';

            const month =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filtered =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate
                        );

                    const nameMatch =
                        (t.destination || '')
                            .toLowerCase()
                            .includes(term);

                    const yearMatch =
                        !year ||
                        String(
                            date.getFullYear()
                        ) === String(year);

                    const monthMatch =
                        !month ||
                        String(
                            date.getMonth() + 1
                        ) === String(month);

                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filtered);

        }



        // =====================================================
        // 여행 카드
        // =====================================================

        function renderTrips(
            tripsToRender = trips
        ) {

            if (!tripList) return;


            tripList
                .querySelectorAll('.trip-card')
                .forEach(card =>
                    card.remove()
                );


            const today =
                new Date();

            today.setHours(
                0, 0, 0, 0
            );


            let filtered =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate
                        );

                    start.setHours(
                        0, 0, 0, 0
                    );

                    if (
                        currentTab === 'upcoming'
                    ) {

                        return start >= today;

                    }

                    return start < today;

                });


            filtered.sort(
                (a, b) =>
                    new Date(a.startDate) -
                    new Date(b.startDate)
            );


            if (
                currentTab === 'past'
            ) {

                filtered.reverse();

            }


            if (
                filtered.length === 0
            ) {

                if (emptyState)
                    emptyState.style.display = 'flex';

                return;

            }


            if (emptyState)
                emptyState.style.display = 'none';


            filtered.forEach(t => {

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
                    async e => {

                        e.stopPropagation();

                        await deleteTrip(
                            t.id
                        );

                    }
                );


                // 카드 클릭
                card.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `trip_detail.html?id=${encodeURIComponent(String(t.id))}`;

                    }
                );


                tripList.appendChild(card);

            });

        }



        // =====================================================
        // 삭제
        // =====================================================

        async function deleteTrip(id) {

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


                trips =
                    trips.filter(
                        t =>
                            String(t.id) !==
                            String(id)
                    );


                renderTrips();
                updateStats();


            }
            catch (error) {

                console.error(
                    '삭제 실패:',
                    error
                );

                alert(
                    '여행 삭제에 실패했습니다.'
                );

            }

        }



        // =====================================================
        // 통계
        // =====================================================

        function updateStats() {

            const today =
                new Date();

            today.setHours(
                0, 0, 0, 0
            );


            const upcoming =
                trips.filter(t =>
                    new Date(t.startDate) >= today
                ).length;


            const past =
                trips.filter(t =>
                    new Date(t.startDate) < today
                ).length;


            if (totalTripsEl)
                totalTripsEl.textContent =
                    trips.length;

            if (upcomingTripsEl)
                upcomingTripsEl.textContent =
                    upcoming;

            if (pastTripsEl)
                pastTripsEl.textContent =
                    past;

        }



        // =====================================================
        // 캘린더
        // =====================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );

            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid) return;


            grid.innerHTML = '';


            const year =
                currentCalendarDate.getFullYear();

            const month =
                currentCalendarDate.getMonth();


            if (monthDisplay) {

                monthDisplay.textContent =
                    `${year}년 ${month + 1}월`;

            }


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            const daysInMonth =
                lastDay.getDate();


            const startDay =
                firstDay.getDay();


            for (
                let i = 0;
                i < startDay;
                i++
            ) {

                const empty =
                    document.createElement('div');

                empty.className =
                    'calendar-day empty';

                grid.appendChild(empty);

            }


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

                number.textContent =
                    day;


                div.appendChild(number);


                const dateStr =
                    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t =>
                        dateStr >= t.startDate &&
                        dateStr <= t.endDate
                    );


                dayTrips.forEach(t => {

                    const label =
                        document.createElement('div');

                    label.className =
                        'trip-label';

                    label.textContent =
                        t.destination;

                    div.appendChild(label);

                });


                grid.appendChild(div);

            }

        }


        const prev =
            document.getElementById(
                'prev-month'
            );

        const next =
            document.getElementById(
                'next-month'
            );


        if (prev) {

            prev.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1
                    );

                    renderCalendar();

                }
            );

        }


        if (next) {

            next.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1
                    );

                    renderCalendar();

                }
            );

        }

    }



    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById(
                'add-btn'
            );

        if (!addBtn) return;


        const destination =
            document.getElementById(
                'destination'
            );

        const startDate =
            document.getElementById(
                'start-date'
            );

        const endDate =
            document.getElementById(
                'end-date'
            );

        const activity =
            document.getElementById(
                'activity'
            );


        addBtn.addEventListener(
            'click',
            async () => {

                const destinationValue =
                    destination.value.trim();

                const startValue =
                    startDate.value;

                const endValue =
                    endDate.value;

                const activityValue =
                    activity
                        ? activity.value.trim()
                        : '';


                if (
                    !destinationValue ||
                    !startValue ||
                    !endValue
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;

                }


                if (
                    endValue < startValue
                ) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;

                }


                const id =
                    String(Date.now());


                const newTrip = {

                    id,

                    destination:
                        destinationValue,

                    startDate:
                        startValue,

                    endDate:
                        endValue,

                    activity:
                        activityValue,

                    places: []

                };


                const success =
                    await saveTrip(
                        newTrip
                    );


                if (success) {

                    window.location.href =
                        'index.html';

                }

            }
        );

    }



    // =========================================================
    // ★ DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        console.log(
            '===== 상세 페이지 시작 ====='
        );


        // -----------------------------------------
        // Leaflet 확인
        // -----------------------------------------

        if (
            typeof L === 'undefined'
        ) {

            console.error(
                'Leaflet이 로드되지 않았습니다.'
            );

            alert(
                '지도 라이브러리를 불러오지 못했습니다.'
            );

            return;

        }


        // -----------------------------------------
        // URL에서 ID 가져오기
        // -----------------------------------------

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            params.get('id');


        console.log(
            'URL 여행 ID:',
            tripId
        );


        if (!tripId) {

            alert(
                '여행 ID가 없습니다.'
            );

            window.location.href =
                'index.html';

            return;

        }


        // -----------------------------------------
        // Firestore 직접 조회
        // -----------------------------------------
        //
        // ★ 여기서 전체 trips를 불러오는 것보다
        // 해당 문서 하나만 가져오는 게 훨씬 안전함.
        //

        try {

            const doc =
                await db
                    .collection('trips')
                    .doc(String(tripId))
                    .get();


            if (!doc.exists) {

                console.error(
                    '여행 문서 없음:',
                    tripId
                );

                alert(
                    '여행 정보를 찾을 수 없습니다.'
                );

                window.location.href =
                    'index.html';

                return;

            }


            const data =
                doc.data();


            currentTrip = {

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
                    Array.isArray(data.places)
                        ? data.places
                        : []

            };


            console.log(
                '상세 여행 데이터:',
                currentTrip
            );


        }
        catch (error) {

            console.error(
                '여행 조회 실패:',
                error
            );

            alert(
                '여행 정보를 불러오지 못했습니다.'
            );

            return;

        }



        // -----------------------------------------
        // HTML 요소
        // -----------------------------------------

        const title =
            document.getElementById(
                'trip-title'
            );

        const dates =
            document.getElementById(
                'trip-dates'
            );

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

        const mapElement =
            document.getElementById(
                'map'
            );


        // -----------------------------------------
        // 제목
        // -----------------------------------------

        if (title) {

            title.textContent =
                currentTrip.destination;

        }


        if (dates) {

            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

        }



        // =====================================================
        // ★★★ MAP 초기화 ★★★
        // =====================================================

        console.log(
            '지도 초기화 시작'
        );


        if (!mapElement) {

            console.error(
                '#map 요소가 없습니다.'
            );

            alert(
                '지도 영역을 찾을 수 없습니다.'
            );

            return;

        }


        // 지도 높이 확인
        console.log(
            '지도 크기:',
            mapElement.offsetWidth,
            mapElement.offsetHeight
        );


        const map =
            L.map(
                mapElement
            ).setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {

                maxZoom: 19,

                attribution:
                    '&copy; OpenStreetMap contributors'

            }
        ).addTo(map);


        console.log(
            'Leaflet 지도 생성 완료'
        );


        // 지도 크기 재계산
        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );



        // =====================================================
        // 장소 렌더링
        // =====================================================

        function renderPlaces() {

            console.log(
                '장소 렌더링:',
                currentTrip.places
            );


            placesList.innerHTML = '';


            // 마커/선 제거
            map.eachLayer(
                layer => {

                    if (
                        layer instanceof L.Marker ||
                        layer instanceof L.Polyline
                    ) {

                        map.removeLayer(layer);

                    }

                }
            );


            if (
                !currentTrip.places ||
                currentTrip.places.length === 0
            ) {

                placesList.innerHTML = `

                    <div class="empty-places">

                        <p>
                            방문할 장소를 추가해보세요!
                        </p>

                    </div>

                `;

                return;

            }


            const latlngs = [];


            currentTrip.places.forEach(
                (place, index) => {

                    // -------------------------------
                    // 목록
                    // -------------------------------

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'place-item' +
                        (
                            place.isLocked
                                ? ' locked'
                                : ''
                        );


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
                            class="lock-btn ${
                                place.isLocked
                                    ? 'active'
                                    : ''
                            }"
                        >
                            <i class="fa-solid ${
                                place.isLocked
                                    ? 'fa-lock'
                                    : 'fa-lock-open'
                            }"></i>
                        </button>

                        <button
                            class="remove-place-btn"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    `;


                    // 잠금
                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    lockBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();

                            place.isLocked =
                                !place.isLocked;

                            await saveCurrentTrip();

                            renderPlaces();

                        }
                    );


                    // 삭제
                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    removeBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();

                            if (
                                !confirm(
                                    `"${place.name}" 장소를 삭제할까요?`
                                )
                            ) {
                                return;
                            }


                            currentTrip.places =
                                currentTrip.places.filter(
                                    p =>
                                        String(p.id) !==
                                        String(place.id)
                                );


                            await saveCurrentTrip();

                            renderPlaces();

                        }
                    );


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

                                await updateOrder();

                            }
                        );

                    }


                    placesList.appendChild(item);


                    // -------------------------------
                    // 지도 마커
                    // -------------------------------

                    const lat =
                        Number(place.lat);

                    const lng =
                        Number(place.lng);


                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                    ) {

                        L.marker(
                            [lat, lng]
                        )
                            .addTo(map)
                            .bindPopup(
                                `${index + 1}. ${escapeHtml(place.name)}`
                            );


                        latlngs.push(
                            [lat, lng]
                        );

                    }

                }
            );


            // -------------------------------
            // 경로
            // -------------------------------

            if (
                latlngs.length > 1
            ) {

                L.polyline(
                    latlngs
                ).addTo(map);


                map.fitBounds(
                    latlngs,
                    {
                        padding: [40, 40]
                    }
                );

            }
            else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    14
                );

            }

        }



        // =====================================================
        // 현재 여행 저장
        // =====================================================

        async function saveCurrentTrip() {

            return await saveTrip(
                currentTrip
            );

        }



        // =====================================================
        // 장소 추가
        // =====================================================

        async function addPlace() {

            const name =
                placeInput.value.trim();


            if (!name) {

                alert(
                    '장소를 입력해주세요.'
                );

                return;

            }


            addPlaceBtn.disabled =
                true;


            try {

                console.log(
                    '장소 검색:',
                    name
                );


                const url =
                    'https://nominatim.openstreetmap.org/search' +
                    '?format=json' +
                    '&limit=1' +
                    '&q=' +
                    encodeURIComponent(name);


                const response =
                    await fetch(
                        url,
                        {
                            headers: {
                                'Accept':
                                    'application/json'
                            }
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }


                const data =
                    await response.json();


                console.log(
                    '검색 결과:',
                    data
                );


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

                    id:
                        String(Date.now()),

                    name,

                    lat:
                        Number(result.lat),

                    lng:
                        Number(result.lon),

                    isLocked:
                        false

                };


                currentTrip.places.push(
                    newPlace
                );


                const success =
                    await saveCurrentTrip();


                if (!success) {

                    // 저장 실패하면 되돌림
                    currentTrip.places.pop();

                    return;

                }


                placeInput.value = '';

                renderPlaces();


            }
            catch (error) {

                console.error(
                    '장소 추가 오류:',
                    error
                );

                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            }
            finally {

                addPlaceBtn.disabled =
                    false;

            }

        }


        if (addPlaceBtn) {

            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        if (placeInput) {

            placeInput.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();

                        addPlace();

                    }

                }
            );

        }



        // =====================================================
        // 드래그 정렬
        // =====================================================

        placesList.addEventListener(
            'dragover',
            e => {

                e.preventDefault();


                const dragging =
                    placesList.querySelector(
                        '.dragging'
                    );


                if (!dragging) return;


                const after =
                    getDragAfterElement(
                        placesList,
                        e.clientY
                    );


                if (!after) {

                    placesList.appendChild(
                        dragging
                    );

                }
                else {

                    placesList.insertBefore(
                        dragging,
                        after
                    );

                }

            }
        );


        function getDragAfterElement(
            container,
            y
        ) {

            const elements =
                [
                    ...container.querySelectorAll(
                        '.place-item:not(.dragging)'
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
                        offset > closest.offset
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



        async function updateOrder() {

            const items =
                placesList.querySelectorAll(
                    '.place-item'
                );


            const ids =
                [...items].map(
                    item =>
                        String(
                            item.dataset.id
                        )
                );


            const reordered = [];


            ids.forEach(id => {

                const found =
                    currentTrip.places.find(
                        p =>
                            String(p.id) === id
                    );


                if (found) {

                    reordered.push(
                        found
                    );

                }

            });


            if (
                reordered.length ===
                currentTrip.places.length
            ) {

                currentTrip.places =
                    reordered;

                await saveCurrentTrip();

                renderPlaces();

            }

        }



        // =====================================================
        // 경로 최적화
        // =====================================================

        if (optimizeBtn) {

            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        async function optimizeRoute() {

            const places =
                currentTrip.places;


            if (
                !places ||
                places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );

                return;

            }


            const unlocked =
                places.filter(
                    p => !p.isLocked
                );


            if (
                unlocked.length < 2
            ) {

                alert(
                    '잠금 해제된 장소가 2개 이상 필요합니다.'
                );

                return;

            }


            // 가장 단순하고 안정적인 최근접 이웃 방식
            const locked =
                places.filter(
                    p => p.isLocked
                );


            const unlockedCopy =
                [...unlocked];


            const result = [];


            // 첫 번째 장소
            let current =
                unlockedCopy.shift();


            result.push(current);


            while (
                unlockedCopy.length > 0
            ) {

                let nearestIndex = 0;
                let nearestDistance =
                    Infinity;


                for (
                    let i = 0;
                    i < unlockedCopy.length;
                    i++
                ) {

                    const distance =
                        calculateDistance(
                            current,
                            unlockedCopy[i]
                        );


                    if (
                        distance <
                        nearestDistance
                    ) {

                        nearestDistance =
                            distance;

                        nearestIndex =
                            i;

                    }

                }


                current =
                    unlockedCopy.splice(
                        nearestIndex,
                        1
                    )[0];


                result.push(
                    current
                );

            }


            // 잠긴 장소는 기존 위치 유지
            const finalRoute =
                new Array(
                    places.length
                ).fill(null);


            places.forEach(
                (p, index) => {

                    if (p.isLocked) {

                        finalRoute[index] =
                            p;

                    }

                }
            );


            let resultIndex = 0;


            for (
                let i = 0;
                i < finalRoute.length;
                i++
            ) {

                if (
                    finalRoute[i] === null
                ) {

                    finalRoute[i] =
                        result[resultIndex++];

                }

            }


            currentTrip.places =
                finalRoute;


            await saveCurrentTrip();

            renderPlaces();


            alert(
                '경로를 최적화했습니다!'
            );

        }



        function calculateDistance(
            a,
            b
        ) {

            const lat1 =
                Number(a.lat);

            const lng1 =
                Number(a.lng);

            const lat2 =
                Number(b.lat);

            const lng2 =
                Number(b.lng);


            if (
                !Number.isFinite(lat1) ||
                !Number.isFinite(lat2)
            ) {

                return Infinity;

            }


            const R = 6371;


            const dLat =
                toRad(lat2 - lat1);

            const dLng =
                toRad(lng2 - lng1);


            const x =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);


            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                )
            );

        }


        function toRad(value) {

            return value *
                Math.PI /
                180;

        }



        // =====================================================
        // ★ 마지막으로 장소 렌더링
        // =====================================================

        renderPlaces();


        console.log(
            '===== 상세 페이지 초기화 완료 ====='
        );

    }



    // =========================================================
    // HTML escape
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                'div'
            );

        div.textContent =
            value ?? '';

        return div.innerHTML;

    }

});
    let trips = [];
    let currentTab = 'upcoming';
    let currentView = 'list';
    let currentCalendarDate = new Date();
    let currentTrip = null;


    // =========================================================
    // 페이지 확인
    // =========================================================

    const isDetailPage =
        document.getElementById('map') &&
        document.getElementById('places-list');

    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    console.log('페이지 확인:', {
        isDetailPage,
        isAddPage,
        isIndexPage
    });


    // =========================================================
    // 페이지 실행
    // =========================================================

    if (isDetailPage) {
        initDetailPage();
    }
    else if (isAddPage) {
        initAddPage();
    }
    else if (isIndexPage) {
        initIndexPage();
    }


    // =========================================================
    // Firestore에서 여행 전체 불러오기
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


                    return {

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
                            Array.isArray(data.places)
                                ? data.places
                                : []

                    };

                });


            console.log(
                'Firestore 여행 데이터:',
                trips
            );


            return trips;

        }
        catch (error) {

            console.error(
                'Firestore 불러오기 실패:',
                error
            );


            alert(
                'Firestore에서 여행 정보를 불러오지 못했습니다.'
            );


            trips = [];


            return [];

        }

    }


    // =========================================================
    // 여행 하나 저장
    // =========================================================

    async function saveTrip(trip) {

        if (!trip) {

            console.error(
                '저장할 여행이 없습니다.'
            );

            return false;

        }


        try {

            const id =
                String(trip.id);


            await db
                .collection('trips')
                .doc(id)
                .set({

                    id:
                        trip.id,

                    destination:
                        trip.destination || '',

                    startDate:
                        trip.startDate || '',

                    endDate:
                        trip.endDate || '',

                    activity:
                        trip.activity || '',

                    places:
                        Array.isArray(trip.places)
                            ? trip.places
                            : []

                }, {

                    merge: true

                });


            console.log(
                '여행 저장 완료:',
                id
            );


            return true;

        }
        catch (error) {

            console.error(
                '여행 저장 실패:',
                error
            );


            alert(
                '여행 저장에 실패했습니다.'
            );


            return false;

        }

    }


    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList =
            document.getElementById(
                'trip-list'
            );

        const calendarView =
            document.getElementById(
                'calendar-view'
            );

        const emptyState =
            document.getElementById(
                'empty-state'
            );

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

        const tabBtns =
            document.querySelectorAll(
                '.tab-btn'
            );

        const viewBtns =
            document.querySelectorAll(
                '.view-btn'
            );


        // =====================================================
        // 검색
        // =====================================================

        const searchNameInput =
            document.getElementById(
                'search-name'
            );

        const searchYearSelect =
            document.getElementById(
                'search-year'
            );

        const searchMonthSelect =
            document.getElementById(
                'search-month'
            );

        const searchBtn =
            document.getElementById(
                'search-btn'
            );


        // =====================================================
        // 연도
        // =====================================================

        if (
            searchYearSelect &&
            searchYearSelect.dataset.initialized !== 'true'
        ) {

            searchYearSelect.dataset.initialized =
                'true';


            const currentYear =
                new Date().getFullYear();


            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    year;


                option.textContent =
                    `${year}년`;


                searchYearSelect.appendChild(
                    option
                );

            }

        }


        // =====================================================
        // 초기 로딩
        // =====================================================

        loadTrips().then(() => {

            renderTrips();

            updateStats();

        });


        // =====================================================
        // 탭
        // =====================================================

        tabBtns.forEach(btn => {

            if (
                btn.dataset.listenerAdded === 'true'
            ) {
                return;
            }


            btn.dataset.listenerAdded =
                'true';


            btn.addEventListener(
                'click',
                () => {

                    tabBtns.forEach(b =>
                        b.classList.remove(
                            'active'
                        )
                    );


                    btn.classList.add(
                        'active'
                    );


                    currentTab =
                        btn.dataset.tab;


                    renderTrips();

                }
            );

        });


        // =====================================================
        // 보기 방식
        // =====================================================

        viewBtns.forEach(btn => {

            if (
                btn.dataset.listenerAdded === 'true'
            ) {
                return;
            }


            btn.dataset.listenerAdded =
                'true';


            btn.addEventListener(
                'click',
                () => {

                    const title =
                        btn.getAttribute(
                            'title'
                        ) || '';


                    if (
                        title.includes('리스트')
                    ) {

                        currentView =
                            'list';


                        if (tripList) {

                            tripList.style.display =
                                'flex';

                        }


                        if (calendarView) {

                            calendarView.style.display =
                                'none';

                        }


                        if (viewBtns[0]) {

                            viewBtns[0].classList.add(
                                'active'
                            );

                        }


                        if (viewBtns[1]) {

                            viewBtns[1].classList.remove(
                                'active'
                            );

                        }


                        renderTrips();

                    }
                    else {

                        currentView =
                            'calendar';


                        if (tripList) {

                            tripList.style.display =
                                'none';

                        }


                        if (calendarView) {

                            calendarView.style.display =
                                'flex';

                        }


                        if (viewBtns[0]) {

                            viewBtns[0].classList.remove(
                                'active'
                            );

                        }


                        if (viewBtns[1]) {

                            viewBtns[1].classList.add(
                                'active'
                            );

                        }


                        renderCalendar();

                    }

                }
            );

        });


        // =====================================================
        // 검색 버튼
        // =====================================================

        if (
            searchBtn &&
            searchBtn.dataset.listenerAdded !== 'true'
        ) {

            searchBtn.dataset.listenerAdded =
                'true';


            searchBtn.addEventListener(
                'click',
                performSearch
            );

        }


        // =====================================================
        // 검색 Enter
        // =====================================================

        if (
            searchNameInput &&
            searchNameInput.dataset.listenerAdded !== 'true'
        ) {

            searchNameInput.dataset.listenerAdded =
                'true';


            searchNameInput.addEventListener(
                'keypress',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        performSearch();

                    }

                }
            );

        }


        // =====================================================
        // 검색 실행
        // =====================================================

        function performSearch() {

            const term =
                searchNameInput
                    ? searchNameInput.value
                        .trim()
                        .toLowerCase()
                    : '';


            const year =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';


            const month =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filtered =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate
                        );


                    const nameMatch =
                        (t.destination || '')
                            .toLowerCase()
                            .includes(term);


                    const yearMatch =
                        !year ||
                        String(
                            date.getFullYear()
                        ) === String(year);


                    const monthMatch =
                        !month ||
                        String(
                            date.getMonth() + 1
                        ) === String(month);


                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filtered);

        }


        // =====================================================
        // 여행 카드
        // =====================================================

        function renderTrips(
            tripsToRender = trips
        ) {

            if (!tripList) {
                return;
            }


            tripList
                .querySelectorAll(
                    '.trip-card'
                )
                .forEach(card =>
                    card.remove()
                );


            const today =
                new Date();


            today.setHours(
                0,
                0,
                0,
                0
            );


            let filtered =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate
                        );


                    start.setHours(
                        0,
                        0,
                        0,
                        0
                    );


                    if (
                        currentTab === 'upcoming'
                    ) {

                        return start >= today;

                    }


                    return start < today;

                });


            filtered.sort(
                (a, b) =>
                    new Date(a.startDate) -
                    new Date(b.startDate)
            );


            if (
                currentTab === 'past'
            ) {

                filtered.reverse();

            }


            if (
                filtered.length === 0
            ) {

                if (emptyState) {

                    emptyState.style.display =
                        'flex';

                }


                return;

            }


            if (emptyState) {

                emptyState.style.display =
                    'none';

            }


            filtered.forEach(t => {

                const card =
                    document.createElement(
                        'div'
                    );


                card.className =
                    'trip-card';


                card.innerHTML = `

                    <div class="trip-info">

                        <h3>
                            ${escapeHtml(
                                t.destination
                            )}
                        </h3>

                        <p>
                            ${escapeHtml(
                                t.startDate
                            )}
                            ~
                            ${escapeHtml(
                                t.endDate
                            )}
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


                if (deleteBtn) {

                    deleteBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();


                            await deleteTrip(
                                t.id
                            );

                        }
                    );

                }


                card.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `trip_detail.html?id=${encodeURIComponent(
                                String(t.id)
                            )}`;

                    }
                );


                tripList.appendChild(
                    card
                );

            });

        }


        // =====================================================
        // 삭제
        // =====================================================

        async function deleteTrip(id) {

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


                trips =
                    trips.filter(
                        t =>
                            String(t.id) !==
                            String(id)
                    );


                renderTrips();

                updateStats();

            }
            catch (error) {

                console.error(
                    '삭제 실패:',
                    error
                );


                alert(
                    '여행 삭제에 실패했습니다.'
                );

            }

        }


        // =====================================================
        // 통계
        // =====================================================

        function updateStats() {

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
                            t.startDate
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
                            t.startDate
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


        // =====================================================
        // 캘린더
        // =====================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );


            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid) {
                return;
            }


            grid.innerHTML =
                '';


            const year =
                currentCalendarDate.getFullYear();


            const month =
                currentCalendarDate.getMonth();


            if (monthDisplay) {

                monthDisplay.textContent =
                    `${year}년 ${month + 1}월`;

            }


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            const daysInMonth =
                lastDay.getDate();


            const startDay =
                firstDay.getDay();


            for (
                let i = 0;
                i < startDay;
                i++
            ) {

                const empty =
                    document.createElement(
                        'div'
                    );


                empty.className =
                    'calendar-day empty';


                grid.appendChild(
                    empty
                );

            }


            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {

                const div =
                    document.createElement(
                        'div'
                    );


                div.className =
                    'calendar-day';


                const number =
                    document.createElement(
                        'span'
                    );


                number.textContent =
                    day;


                div.appendChild(
                    number
                );


                const dateStr =
                    `${year}-${String(
                        month + 1
                    ).padStart(2, '0')}-${String(
                        day
                    ).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t =>
                        dateStr >= t.startDate &&
                        dateStr <= t.endDate
                    );


                dayTrips.forEach(t => {

                    const label =
                        document.createElement(
                            'div'
                        );


                    label.className =
                        'trip-label';


                    label.textContent =
                        t.destination;


                    div.appendChild(
                        label
                    );

                });


                grid.appendChild(
                    div
                );

            }

        }


        const prev =
            document.getElementById(
                'prev-month'
            );


        const next =
            document.getElementById(
                'next-month'
            );


        if (
            prev &&
            prev.dataset.listenerAdded !== 'true'
        ) {

            prev.dataset.listenerAdded =
                'true';


            prev.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1
                    );


                    renderCalendar();

                }
            );

        }


        if (
            next &&
            next.dataset.listenerAdded !== 'true'
        ) {

            next.dataset.listenerAdded =
                'true';


            next.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1
                    );


                    renderCalendar();

                }
            );

        }

    }


    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById(
                'add-btn'
            );


        if (!addBtn) {
            return;
        }


        // -----------------------------------------------------
        // ★ 이미 이벤트가 등록되어 있으면 다시 등록하지 않음
        // -----------------------------------------------------

        if (
            addBtn.dataset.listenerAdded === 'true'
        ) {

            console.warn(
                '일정 추가 버튼 이벤트가 이미 등록되어 있습니다.'
            );

            return;

        }


        addBtn.dataset.listenerAdded =
            'true';


        const destination =
            document.getElementById(
                'destination'
            );


        const startDate =
            document.getElementById(
                'start-date'
            );


        const endDate =
            document.getElementById(
                'end-date'
            );


        const activity =
            document.getElementById(
                'activity'
            );


        // -----------------------------------------------------
        // ★ 중복 저장 방지용 상태
        // -----------------------------------------------------

        let isSaving =
            false;


        // -----------------------------------------------------
        // 일정 추가
        // -----------------------------------------------------

        addBtn.addEventListener(
            'click',
            async () => {

                // 이미 저장 중이면 아무것도 하지 않음
                if (isSaving) {

                    console.warn(
                        '이미 일정 저장 중입니다.'
                    );

                    return;

                }


                const destinationValue =
                    destination
                        ? destination.value.trim()
                        : '';


                const startValue =
                    startDate
                        ? startDate.value
                        : '';


                const endValue =
                    endDate
                        ? endDate.value
                        : '';


                const activityValue =
                    activity
                        ? activity.value.trim()
                        : '';


                // -------------------------------------------------
                // 필수값 확인
                // -------------------------------------------------

                if (
                    !destinationValue ||
                    !startValue ||
                    !endValue
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;

                }


                // -------------------------------------------------
                // 날짜 확인
                // -------------------------------------------------

                if (
                    endValue < startValue
                ) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;

                }


                // -------------------------------------------------
                // ★ 저장 시작
                // -------------------------------------------------

                isSaving =
                    true;


                addBtn.disabled =
                    true;


                const originalText =
                    addBtn.innerHTML;


                addBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    저장 중...
                `;


                try {

                    // -------------------------------------------------
                    // ID 생성
                    // -------------------------------------------------

                    const id =
                        String(
                            Date.now()
                        );


                    const newTrip = {

                        id,

                        destination:
                            destinationValue,

                        startDate:
                            startValue,

                        endDate:
                            endValue,

                        activity:
                            activityValue,

                        places:
                            []

                    };


                    console.log(
                        '새 여행 저장 시작:',
                        newTrip
                    );


                    // -------------------------------------------------
                    // ★ Firestore 한 번만 저장
                    // -------------------------------------------------

                    const success =
                        await saveTrip(
                            newTrip
                        );


                    if (success) {

                        console.log(
                            '새 여행 저장 성공:',
                            id
                        );


                        // 저장 성공 후에만 이동
                        window.location.href =
                            'index.html';


                        return;

                    }


                    // 저장 실패
                    isSaving =
                        false;


                    addBtn.disabled =
                        false;


                    addBtn.innerHTML =
                        originalText;

                }
                catch (error) {

                    console.error(
                        '일정 추가 실패:',
                        error
                    );


                    alert(
                        '일정을 추가하는 중 오류가 발생했습니다.'
                    );


                    isSaving =
                        false;


                    addBtn.disabled =
                        false;


                    addBtn.innerHTML =
                        originalText;

                }

            }
        );


        // =====================================================
        // Enter로 일정 추가
        // =====================================================

        const formInputs = [
            destination,
            startDate,
            endDate,
            activity
        ];


        formInputs.forEach(input => {

            if (!input) {
                return;
            }


            if (
                input.dataset.listenerAdded === 'true'
            ) {

                return;

            }


            input.dataset.listenerAdded =
                'true';


            input.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();


                        // 버튼의 click 이벤트 하나만 실행
                        if (!isSaving) {

                            addBtn.click();

                        }

                    }

                }
            );

        });

    }


    // =========================================================
    // DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        console.log(
            '===== 상세 페이지 시작 ====='
        );


        // =====================================================
        // Leaflet 확인
        // =====================================================

        if (
            typeof L === 'undefined'
        ) {

            console.error(
                'Leaflet이 로드되지 않았습니다.'
            );


            alert(
                '지도 라이브러리를 불러오지 못했습니다.'
            );


            return;

        }


        // =====================================================
        // URL ID
        // =====================================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            params.get('id');


        console.log(
            'URL 여행 ID:',
            tripId
        );


        if (!tripId) {

            alert(
                '여행 ID가 없습니다.'
            );


            window.location.href =
                'index.html';


            return;

        }


        // =====================================================
        // Firestore에서 여행 하나 조회
        // =====================================================

        try {

            const doc =
                await db
                    .collection('trips')
                    .doc(String(tripId))
                    .get();


            if (!doc.exists) {

                console.error(
                    '여행 문서 없음:',
                    tripId
                );


                alert(
                    '여행 정보를 찾을 수 없습니다.'
                );


                window.location.href =
                    'index.html';


                return;

            }


            const data =
                doc.data();


            currentTrip = {

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
                    Array.isArray(data.places)
                        ? data.places
                        : []

            };


            console.log(
                '상세 여행 데이터:',
                currentTrip
            );

        }
        catch (error) {

            console.error(
                '여행 조회 실패:',
                error
            );


            alert(
                '여행 정보를 불러오지 못했습니다.'
            );


            return;

        }


        // =====================================================
        // HTML 요소
        // =====================================================

        const title =
            document.getElementById(
                'trip-title'
            );


        const dates =
            document.getElementById(
                'trip-dates'
            );


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


        const mapElement =
            document.getElementById(
                'map'
            );


        // =====================================================
        // 제목 / 날짜
        // =====================================================

        if (title) {

            title.textContent =
                currentTrip.destination;

        }


        if (dates) {

            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

        }


        // =====================================================
        // 지도
        // =====================================================

        if (!mapElement) {

            console.error(
                '#map 요소가 없습니다.'
            );


            alert(
                '지도 영역을 찾을 수 없습니다.'
            );


            return;

        }


        const map =
            L.map(
                mapElement
            ).setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {

                maxZoom:
                    19,

                attribution:
                    '&copy; OpenStreetMap contributors'

            }
        ).addTo(
            map
        );


        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );


        // =====================================================
        // 장소 렌더링
        // =====================================================

        function renderPlaces() {

            if (!placesList) {
                return;
            }


            placesList.innerHTML =
                '';


            map.eachLayer(
                layer => {

                    if (
                        layer instanceof L.Marker ||
                        layer instanceof L.Polyline
                    ) {

                        map.removeLayer(
                            layer
                        );

                    }

                }
            );


            if (
                !currentTrip.places ||
                currentTrip.places.length === 0
            ) {

                placesList.innerHTML = `

                    <div class="empty-places">

                        <p>
                            방문할 장소를 추가해보세요!
                        </p>

                    </div>

                `;


                return;

            }


            const latlngs =
                [];


            currentTrip.places.forEach(
                (place, index) => {

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'place-item' +
                        (
                            place.isLocked
                                ? ' locked'
                                : ''
                        );


                    item.dataset.id =
                        String(
                            place.id
                        );


                    item.draggable =
                        !place.isLocked;


                    item.innerHTML = `

                        <span class="place-number">
                            ${index + 1}
                        </span>

                        <span class="place-name">
                            ${escapeHtml(
                                place.name
                            )}
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


                    // =================================================
                    // 잠금
                    // =================================================

                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    if (lockBtn) {

                        lockBtn.addEventListener(
                            'click',
                            async e => {

                                e.stopPropagation();


                                place.isLocked =
                                    !place.isLocked;


                                await saveCurrentTrip();


                                renderPlaces();

                            }
                        );

                    }


                    // =================================================
                    // 삭제
                    // =================================================

                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    if (removeBtn) {

                        removeBtn.addEventListener(
                            'click',
                            async e => {

                                e.stopPropagation();


                                if (
                                    !confirm(
                                        `"${place.name}" 장소를 삭제할까요?`
                                    )
                                ) {

                                    return;

                                }


                                currentTrip.places =
                                    currentTrip.places.filter(
                                        p =>
                                            String(p.id) !==
                                            String(place.id)
                                    );


                                await saveCurrentTrip();


                                renderPlaces();

                            }
                        );

                    }


                    // =================================================
                    // 드래그
                    // =================================================

                    if (
                        !place.isLocked
                    ) {

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


                    // =================================================
                    // 지도 마커
                    // =================================================

                    const lat =
                        Number(
                            place.lat
                        );


                    const lng =
                        Number(
                            place.lng
                        );


                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                    ) {

                        L.marker(
                            [lat, lng]
                        )
                            .addTo(map)
                            .bindPopup(
                                `${index + 1}. ${escapeHtml(
                                    place.name
                                )}`
                            );


                        latlngs.push(
                            [lat, lng]
                        );

                    }

                }
            );


            // =====================================================
            // 경로
            // =====================================================

            if (
                latlngs.length > 1
            ) {

                L.polyline(
                    latlngs
                ).addTo(
                    map
                );


                map.fitBounds(
                    latlngs,
                    {
                        padding: [
                            40,
                            40
                        ]
                    }
                );

            }
            else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    14
                );

            }

        }


        // =====================================================
        // 현재 여행 저장
        // =====================================================

        async function saveCurrentTrip() {

            return await saveTrip(
                currentTrip
            );

        }


        // =====================================================
        // 장소 추가
        // =====================================================

        let isAddingPlace =
            false;


        async function addPlace() {

            if (isAddingPlace) {
                return;
            }


            if (!placeInput) {
                return;
            }


            const name =
                placeInput.value.trim();


            if (!name) {

                alert(
                    '장소를 입력해주세요.'
                );


                return;

            }


            isAddingPlace =
                true;


            if (addPlaceBtn) {

                addPlaceBtn.disabled =
                    true;

            }


            try {

                const url =
                    'https://nominatim.openstreetmap.org/search' +
                    '?format=json' +
                    '&limit=1' +
                    '&q=' +
                    encodeURIComponent(name);


                const response =
                    await fetch(
                        url,
                        {

                            headers: {

                                Accept:
                                    'application/json'

                            }

                        }
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

                    id:
                        String(
                            Date.now()
                        ),

                    name,

                    lat:
                        Number(
                            result.lat
                        ),

                    lng:
                        Number(
                            result.lon
                        ),

                    isLocked:
                        false

                };


                currentTrip.places.push(
                    newPlace
                );


                const success =
                    await saveCurrentTrip();


                if (!success) {

                    currentTrip.places.pop();


                    return;

                }


                placeInput.value =
                    '';


                renderPlaces();

            }
            catch (error) {

                console.error(
                    '장소 추가 오류:',
                    error
                );


                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            }
            finally {

                isAddingPlace =
                    false;


                if (addPlaceBtn) {

                    addPlaceBtn.disabled =
                        false;

                }

            }

        }


        // =====================================================
        // 장소 추가 버튼
        // =====================================================

        if (
            addPlaceBtn &&
            addPlaceBtn.dataset.listenerAdded !== 'true'
        ) {

            addPlaceBtn.dataset.listenerAdded =
                'true';


            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        // =====================================================
        // 장소 Enter
        // =====================================================

        if (
            placeInput &&
            placeInput.dataset.listenerAdded !== 'true'
        ) {

            placeInput.dataset.listenerAdded =
                'true';


            placeInput.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();


                        addPlace();

                    }

                }
            );

        }


        // =====================================================
        // 드래그 정렬
        // =====================================================

        if (
            placesList &&
            placesList.dataset.listenerAdded !== 'true'
        ) {

            placesList.dataset.listenerAdded =
                'true';


            placesList.addEventListener(
                'dragover',
                e => {

                    e.preventDefault();


                    const dragging =
                        placesList.querySelector(
                            '.dragging'
                        );


                    if (!dragging) {
                        return;
                    }


                    const after =
                        getDragAfterElement(
                            placesList,
                            e.clientY
                        );


                    if (!after) {

                        placesList.appendChild(
                            dragging
                        );

                    }
                    else {

                        placesList.insertBefore(
                            dragging,
                            after
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
                        '.place-item:not(.dragging)'
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
                        offset > closest.offset
                    ) {

                        closest = {

                            offset,

                            element:
                                child

                        };

                    }

                }
            );


            return closest.element;

        }


        // =====================================================
        // 순서 업데이트
        // =====================================================

        async function updateOrder() {

            if (!placesList) {
                return;
            }


            const items =
                placesList.querySelectorAll(
                    '.place-item'
                );


            const ids =
                [...items].map(
                    item =>
                        String(
                            item.dataset.id
                        )
                );


            const reordered =
                [];


            ids.forEach(id => {

                const found =
                    currentTrip.places.find(
                        p =>
                            String(p.id) ===
                            id
                    );


                if (found) {

                    reordered.push(
                        found
                    );

                }

            });


            if (
                reordered.length ===
                currentTrip.places.length
            ) {

                currentTrip.places =
                    reordered;


                await saveCurrentTrip();


                renderPlaces();

            }

        }


        // =====================================================
        // 경로 최적화
        // =====================================================

        if (
            optimizeBtn &&
            optimizeBtn.dataset.listenerAdded !== 'true'
        ) {

            optimizeBtn.dataset.listenerAdded =
                'true';


            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        let isOptimizing =
            false;


        async function optimizeRoute() {

            if (isOptimizing) {
                return;
            }


            const places =
                currentTrip.places;


            if (
                !places ||
                places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );


                return;

            }


            const unlocked =
                places.filter(
                    p =>
                        !p.isLocked
                );


            if (
                unlocked.length < 2
            ) {

                alert(
                    '잠금 해제된 장소가 2개 이상 필요합니다.'
                );


                return;

            }


            isOptimizing =
                true;


            if (optimizeBtn) {

                optimizeBtn.disabled =
                    true;

            }


            try {

                const unlockedCopy =
                    [...unlocked];


                const result =
                    [];


                let current =
                    unlockedCopy.shift();


                result.push(
                    current
                );


                while (
                    unlockedCopy.length > 0
                ) {

                    let nearestIndex =
                        0;


                    let nearestDistance =
                        Infinity;


                    for (
                        let i = 0;
                        i < unlockedCopy.length;
                        i++
                    ) {

                        const distance =
                            calculateDistance(
                                current,
                                unlockedCopy[i]
                            );


                        if (
                            distance <
                            nearestDistance
                        ) {

                            nearestDistance =
                                distance;


                            nearestIndex =
                                i;

                        }

                    }


                    current =
                        unlockedCopy.splice(
                            nearestIndex,
                            1
                        )[0];


                    result.push(
                        current
                    );

                }


                // 잠긴 장소는 기존 위치 유지
                const finalRoute =
                    new Array(
                        places.length
                    ).fill(null);


                places.forEach(
                    (p, index) => {

                        if (
                            p.isLocked
                        ) {

                            finalRoute[index] =
                                p;

                        }

                    }
                );


                let resultIndex =
                    0;


                for (
                    let i = 0;
                    i < finalRoute.length;
                    i++
                ) {

                    if (
                        finalRoute[i] === null
                    ) {

                        finalRoute[i] =
                            result[
                                resultIndex++
                            ];

                    }

                }


                currentTrip.places =
                    finalRoute;


                await saveCurrentTrip();


                renderPlaces();


                alert(
                    '경로를 최적화했습니다!'
                );

            }
            catch (error) {

                console.error(
                    '경로 최적화 실패:',
                    error
                );


                alert(
                    '경로 최적화 중 오류가 발생했습니다.'
                );

            }
            finally {

                isOptimizing =
                    false;


                if (optimizeBtn) {

                    optimizeBtn.disabled =
                        false;

                }

            }

        }


        function calculateDistance(
            a,
            b
        ) {

            const lat1 =
                Number(a.lat);


            const lng1 =
                Number(a.lng);


            const lat2 =
                Number(b.lat);


            const lng2 =
                Number(b.lng);


            if (
                !Number.isFinite(lat1) ||
                !Number.isFinite(lat2)
            ) {

                return Infinity;

            }


            const R =
                6371;


            const dLat =
                toRad(
                    lat2 - lat1
                );


            const dLng =
                toRad(
                    lng2 - lng1
                );


            const x =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +
                Math.cos(
                    toRad(lat1)
                ) *
                Math.cos(
                    toRad(lat2)
                ) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);


            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                )
            );

        }


        function toRad(value) {

            return (
                value *
                Math.PI /
                180
            );

        }


        // =====================================================
        // 초기 장소 렌더링
        // =====================================================

        renderPlaces();


        console.log(
            '===== 상세 페이지 초기화 완료 ====='
        );

    }


    // =========================================================
    // HTML escape
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                'div'
            );


        div.textContent =
            value ?? '';


        return div.innerHTML;

    }

});
    const isAddPage =
        document.getElementById('add-btn');

    const isIndexPage =
        document.getElementById('trip-list');


    console.log('페이지 확인:', {
        isDetailPage,
        isAddPage,
        isIndexPage
    });


    // =========================================================
    // 페이지 실행
    // =========================================================

    if (isDetailPage) {
        initDetailPage();
    }
    else if (isAddPage) {
        initAddPage();
    }
    else if (isIndexPage) {
        initIndexPage();
    }



    // =========================================================
    // Firestore에서 여행 전체 불러오기
    // =========================================================

    async function loadTrips() {

        try {

            const snapshot = await db
                .collection('trips')
                .get();

            trips = snapshot.docs.map(doc => {

                const data = doc.data();

                return {
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
                        Array.isArray(data.places)
                            ? data.places
                            : []
                };

            });

            console.log('Firestore 여행 데이터:', trips);

            return trips;

        }
        catch (error) {

            console.error(
                'Firestore 불러오기 실패:',
                error
            );

            alert(
                'Firestore에서 여행 정보를 불러오지 못했습니다.'
            );

            trips = [];

            return [];

        }

    }



    // =========================================================
    // 여행 하나 저장
    // =========================================================

    async function saveTrip(trip) {

        if (!trip) {
            console.error('저장할 여행이 없습니다.');
            return false;
        }

        try {

            const id = String(trip.id);

            await db
                .collection('trips')
                .doc(id)
                .set({

                    id: trip.id,

                    destination:
                        trip.destination || '',

                    startDate:
                        trip.startDate || '',

                    endDate:
                        trip.endDate || '',

                    activity:
                        trip.activity || '',

                    places:
                        Array.isArray(trip.places)
                            ? trip.places
                            : []

                }, {
                    merge: true
                });

            console.log(
                '여행 저장 완료:',
                id
            );

            return true;

        }
        catch (error) {

            console.error(
                '여행 저장 실패:',
                error
            );

            alert(
                '여행 저장에 실패했습니다.'
            );

            return false;

        }

    }



    // =========================================================
    // INDEX PAGE
    // =========================================================

    function initIndexPage() {

        const tripList =
            document.getElementById('trip-list');

        const calendarView =
            document.getElementById('calendar-view');

        const emptyState =
            document.getElementById('empty-state');

        const totalTripsEl =
            document.getElementById('total-trips');

        const upcomingTripsEl =
            document.getElementById('upcoming-trips');

        const pastTripsEl =
            document.getElementById('past-trips');

        const tabBtns =
            document.querySelectorAll('.tab-btn');

        const viewBtns =
            document.querySelectorAll('.view-btn');


        // -----------------------------------------
        // 검색
        // -----------------------------------------

        const searchNameInput =
            document.getElementById('search-name');

        const searchYearSelect =
            document.getElementById('search-year');

        const searchMonthSelect =
            document.getElementById('search-month');

        const searchBtn =
            document.getElementById('search-btn');


        // -----------------------------------------
        // 연도
        // -----------------------------------------

        if (searchYearSelect) {

            const currentYear =
                new Date().getFullYear();

            for (
                let year = currentYear - 5;
                year <= currentYear + 5;
                year++
            ) {

                const option =
                    document.createElement('option');

                option.value = year;
                option.textContent = `${year}년`;

                searchYearSelect.appendChild(option);

            }

        }


        // -----------------------------------------
        // 초기 로딩
        // -----------------------------------------

        loadTrips().then(() => {

            renderTrips();
            updateStats();

        });


        // -----------------------------------------
        // 탭
        // -----------------------------------------

        tabBtns.forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    tabBtns.forEach(b =>
                        b.classList.remove('active')
                    );

                    btn.classList.add('active');

                    currentTab =
                        btn.dataset.tab;

                    renderTrips();

                }
            );

        });


        // -----------------------------------------
        // 보기 방식
        // -----------------------------------------

        viewBtns.forEach(btn => {

            btn.addEventListener(
                'click',
                () => {

                    const title =
                        btn.getAttribute('title') || '';

                    if (
                        title.includes('리스트')
                    ) {

                        currentView = 'list';

                        if (tripList)
                            tripList.style.display = 'flex';

                        if (calendarView)
                            calendarView.style.display = 'none';

                        if (viewBtns[0])
                            viewBtns[0].classList.add('active');

                        if (viewBtns[1])
                            viewBtns[1].classList.remove('active');

                        renderTrips();

                    }
                    else {

                        currentView = 'calendar';

                        if (tripList)
                            tripList.style.display = 'none';

                        if (calendarView)
                            calendarView.style.display = 'flex';

                        if (viewBtns[0])
                            viewBtns[0].classList.remove('active');

                        if (viewBtns[1])
                            viewBtns[1].classList.add('active');

                        renderCalendar();

                    }

                }
            );

        });


        // -----------------------------------------
        // 검색
        // -----------------------------------------

        if (searchBtn) {

            searchBtn.addEventListener(
                'click',
                performSearch
            );

        }

        if (searchNameInput) {

            searchNameInput.addEventListener(
                'keypress',
                e => {

                    if (e.key === 'Enter') {
                        performSearch();
                    }

                }
            );

        }


        function performSearch() {

            const term =
                searchNameInput
                    ? searchNameInput.value
                        .trim()
                        .toLowerCase()
                    : '';

            const year =
                searchYearSelect
                    ? searchYearSelect.value
                    : '';

            const month =
                searchMonthSelect
                    ? searchMonthSelect.value
                    : '';


            const filtered =
                trips.filter(t => {

                    const date =
                        new Date(
                            t.startDate
                        );

                    const nameMatch =
                        (t.destination || '')
                            .toLowerCase()
                            .includes(term);

                    const yearMatch =
                        !year ||
                        String(
                            date.getFullYear()
                        ) === String(year);

                    const monthMatch =
                        !month ||
                        String(
                            date.getMonth() + 1
                        ) === String(month);

                    return (
                        nameMatch &&
                        yearMatch &&
                        monthMatch
                    );

                });


            renderTrips(filtered);

        }



        // =====================================================
        // 여행 카드
        // =====================================================

        function renderTrips(
            tripsToRender = trips
        ) {

            if (!tripList) return;


            tripList
                .querySelectorAll('.trip-card')
                .forEach(card =>
                    card.remove()
                );


            const today =
                new Date();

            today.setHours(
                0, 0, 0, 0
            );


            let filtered =
                tripsToRender.filter(t => {

                    const start =
                        new Date(
                            t.startDate
                        );

                    start.setHours(
                        0, 0, 0, 0
                    );

                    if (
                        currentTab === 'upcoming'
                    ) {

                        return start >= today;

                    }

                    return start < today;

                });


            filtered.sort(
                (a, b) =>
                    new Date(a.startDate) -
                    new Date(b.startDate)
            );


            if (
                currentTab === 'past'
            ) {

                filtered.reverse();

            }


            if (
                filtered.length === 0
            ) {

                if (emptyState)
                    emptyState.style.display = 'flex';

                return;

            }


            if (emptyState)
                emptyState.style.display = 'none';


            filtered.forEach(t => {

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
                    async e => {

                        e.stopPropagation();

                        await deleteTrip(
                            t.id
                        );

                    }
                );


                // 카드 클릭
                card.addEventListener(
                    'click',
                    () => {

                        window.location.href =
                            `trip_detail.html?id=${encodeURIComponent(String(t.id))}`;

                    }
                );


                tripList.appendChild(card);

            });

        }



        // =====================================================
        // 삭제
        // =====================================================

        async function deleteTrip(id) {

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


                trips =
                    trips.filter(
                        t =>
                            String(t.id) !==
                            String(id)
                    );


                renderTrips();
                updateStats();


            }
            catch (error) {

                console.error(
                    '삭제 실패:',
                    error
                );

                alert(
                    '여행 삭제에 실패했습니다.'
                );

            }

        }



        // =====================================================
        // 통계
        // =====================================================

        function updateStats() {

            const today =
                new Date();

            today.setHours(
                0, 0, 0, 0
            );


            const upcoming =
                trips.filter(t =>
                    new Date(t.startDate) >= today
                ).length;


            const past =
                trips.filter(t =>
                    new Date(t.startDate) < today
                ).length;


            if (totalTripsEl)
                totalTripsEl.textContent =
                    trips.length;

            if (upcomingTripsEl)
                upcomingTripsEl.textContent =
                    upcoming;

            if (pastTripsEl)
                pastTripsEl.textContent =
                    past;

        }



        // =====================================================
        // 캘린더
        // =====================================================

        function renderCalendar() {

            const grid =
                document.getElementById(
                    'calendar-grid'
                );

            const monthDisplay =
                document.getElementById(
                    'current-month-display'
                );


            if (!grid) return;


            grid.innerHTML = '';


            const year =
                currentCalendarDate.getFullYear();

            const month =
                currentCalendarDate.getMonth();


            if (monthDisplay) {

                monthDisplay.textContent =
                    `${year}년 ${month + 1}월`;

            }


            const firstDay =
                new Date(
                    year,
                    month,
                    1
                );


            const lastDay =
                new Date(
                    year,
                    month + 1,
                    0
                );


            const daysInMonth =
                lastDay.getDate();


            const startDay =
                firstDay.getDay();


            for (
                let i = 0;
                i < startDay;
                i++
            ) {

                const empty =
                    document.createElement('div');

                empty.className =
                    'calendar-day empty';

                grid.appendChild(empty);

            }


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

                number.textContent =
                    day;


                div.appendChild(number);


                const dateStr =
                    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;


                const dayTrips =
                    trips.filter(t =>
                        dateStr >= t.startDate &&
                        dateStr <= t.endDate
                    );


                dayTrips.forEach(t => {

                    const label =
                        document.createElement('div');

                    label.className =
                        'trip-label';

                    label.textContent =
                        t.destination;

                    div.appendChild(label);

                });


                grid.appendChild(div);

            }

        }


        const prev =
            document.getElementById(
                'prev-month'
            );

        const next =
            document.getElementById(
                'next-month'
            );


        if (prev) {

            prev.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1
                    );

                    renderCalendar();

                }
            );

        }


        if (next) {

            next.addEventListener(
                'click',
                () => {

                    currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1
                    );

                    renderCalendar();

                }
            );

        }

    }



    // =========================================================
    // ADD PAGE
    // =========================================================

    function initAddPage() {

        const addBtn =
            document.getElementById(
                'add-btn'
            );

        if (!addBtn) return;


        const destination =
            document.getElementById(
                'destination'
            );

        const startDate =
            document.getElementById(
                'start-date'
            );

        const endDate =
            document.getElementById(
                'end-date'
            );

        const activity =
            document.getElementById(
                'activity'
            );


        addBtn.addEventListener(
            'click',
            async () => {

                const destinationValue =
                    destination.value.trim();

                const startValue =
                    startDate.value;

                const endValue =
                    endDate.value;

                const activityValue =
                    activity
                        ? activity.value.trim()
                        : '';


                if (
                    !destinationValue ||
                    !startValue ||
                    !endValue
                ) {

                    alert(
                        '필수 정보를 입력해주세요.'
                    );

                    return;

                }


                if (
                    endValue < startValue
                ) {

                    alert(
                        '종료일은 시작일보다 빠를 수 없습니다.'
                    );

                    return;

                }


                const id =
                    String(Date.now());


                const newTrip = {

                    id,

                    destination:
                        destinationValue,

                    startDate:
                        startValue,

                    endDate:
                        endValue,

                    activity:
                        activityValue,

                    places: []

                };


                const success =
                    await saveTrip(
                        newTrip
                    );


                if (success) {

                    window.location.href =
                        'index.html';

                }

            }
        );

    }



    // =========================================================
    // ★ DETAIL PAGE
    // =========================================================

    async function initDetailPage() {

        console.log(
            '===== 상세 페이지 시작 ====='
        );


        // -----------------------------------------
        // Leaflet 확인
        // -----------------------------------------

        if (
            typeof L === 'undefined'
        ) {

            console.error(
                'Leaflet이 로드되지 않았습니다.'
            );

            alert(
                '지도 라이브러리를 불러오지 못했습니다.'
            );

            return;

        }


        // -----------------------------------------
        // URL에서 ID 가져오기
        // -----------------------------------------

        const params =
            new URLSearchParams(
                window.location.search
            );


        const tripId =
            params.get('id');


        console.log(
            'URL 여행 ID:',
            tripId
        );


        if (!tripId) {

            alert(
                '여행 ID가 없습니다.'
            );

            window.location.href =
                'index.html';

            return;

        }


        // -----------------------------------------
        // Firestore 직접 조회
        // -----------------------------------------
        //
        // ★ 여기서 전체 trips를 불러오는 것보다
        // 해당 문서 하나만 가져오는 게 훨씬 안전함.
        //

        try {

            const doc =
                await db
                    .collection('trips')
                    .doc(String(tripId))
                    .get();


            if (!doc.exists) {

                console.error(
                    '여행 문서 없음:',
                    tripId
                );

                alert(
                    '여행 정보를 찾을 수 없습니다.'
                );

                window.location.href =
                    'index.html';

                return;

            }


            const data =
                doc.data();


            currentTrip = {

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
                    Array.isArray(data.places)
                        ? data.places
                        : []

            };


            console.log(
                '상세 여행 데이터:',
                currentTrip
            );


        }
        catch (error) {

            console.error(
                '여행 조회 실패:',
                error
            );

            alert(
                '여행 정보를 불러오지 못했습니다.'
            );

            return;

        }



        // -----------------------------------------
        // HTML 요소
        // -----------------------------------------

        const title =
            document.getElementById(
                'trip-title'
            );

        const dates =
            document.getElementById(
                'trip-dates'
            );

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

        const mapElement =
            document.getElementById(
                'map'
            );


        // -----------------------------------------
        // 제목
        // -----------------------------------------

        if (title) {

            title.textContent =
                currentTrip.destination;

        }


        if (dates) {

            dates.textContent =
                `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

        }



        // =====================================================
        // ★★★ MAP 초기화 ★★★
        // =====================================================

        console.log(
            '지도 초기화 시작'
        );


        if (!mapElement) {

            console.error(
                '#map 요소가 없습니다.'
            );

            alert(
                '지도 영역을 찾을 수 없습니다.'
            );

            return;

        }


        // 지도 높이 확인
        console.log(
            '지도 크기:',
            mapElement.offsetWidth,
            mapElement.offsetHeight
        );


        const map =
            L.map(
                mapElement
            ).setView(
                [37.5665, 126.9780],
                10
            );


        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {

                maxZoom: 19,

                attribution:
                    '&copy; OpenStreetMap contributors'

            }
        ).addTo(map);


        console.log(
            'Leaflet 지도 생성 완료'
        );


        // 지도 크기 재계산
        setTimeout(
            () => {

                map.invalidateSize();

            },
            300
        );



        // =====================================================
        // 장소 렌더링
        // =====================================================

        function renderPlaces() {

            console.log(
                '장소 렌더링:',
                currentTrip.places
            );


            placesList.innerHTML = '';


            // 마커/선 제거
            map.eachLayer(
                layer => {

                    if (
                        layer instanceof L.Marker ||
                        layer instanceof L.Polyline
                    ) {

                        map.removeLayer(layer);

                    }

                }
            );


            if (
                !currentTrip.places ||
                currentTrip.places.length === 0
            ) {

                placesList.innerHTML = `

                    <div class="empty-places">

                        <p>
                            방문할 장소를 추가해보세요!
                        </p>

                    </div>

                `;

                return;

            }


            const latlngs = [];


            currentTrip.places.forEach(
                (place, index) => {

                    // -------------------------------
                    // 목록
                    // -------------------------------

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'place-item' +
                        (
                            place.isLocked
                                ? ' locked'
                                : ''
                        );


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
                            class="lock-btn ${
                                place.isLocked
                                    ? 'active'
                                    : ''
                            }"
                        >
                            <i class="fa-solid ${
                                place.isLocked
                                    ? 'fa-lock'
                                    : 'fa-lock-open'
                            }"></i>
                        </button>

                        <button
                            class="remove-place-btn"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    `;


                    // 잠금
                    const lockBtn =
                        item.querySelector(
                            '.lock-btn'
                        );


                    lockBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();

                            place.isLocked =
                                !place.isLocked;

                            await saveCurrentTrip();

                            renderPlaces();

                        }
                    );


                    // 삭제
                    const removeBtn =
                        item.querySelector(
                            '.remove-place-btn'
                        );


                    removeBtn.addEventListener(
                        'click',
                        async e => {

                            e.stopPropagation();

                            if (
                                !confirm(
                                    `"${place.name}" 장소를 삭제할까요?`
                                )
                            ) {
                                return;
                            }


                            currentTrip.places =
                                currentTrip.places.filter(
                                    p =>
                                        String(p.id) !==
                                        String(place.id)
                                );


                            await saveCurrentTrip();

                            renderPlaces();

                        }
                    );


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

                                await updateOrder();

                            }
                        );

                    }


                    placesList.appendChild(item);


                    // -------------------------------
                    // 지도 마커
                    // -------------------------------

                    const lat =
                        Number(place.lat);

                    const lng =
                        Number(place.lng);


                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng)
                    ) {

                        L.marker(
                            [lat, lng]
                        )
                            .addTo(map)
                            .bindPopup(
                                `${index + 1}. ${escapeHtml(place.name)}`
                            );


                        latlngs.push(
                            [lat, lng]
                        );

                    }

                }
            );


            // -------------------------------
            // 경로
            // -------------------------------

            if (
                latlngs.length > 1
            ) {

                L.polyline(
                    latlngs
                ).addTo(map);


                map.fitBounds(
                    latlngs,
                    {
                        padding: [40, 40]
                    }
                );

            }
            else if (
                latlngs.length === 1
            ) {

                map.setView(
                    latlngs[0],
                    14
                );

            }

        }



        // =====================================================
        // 현재 여행 저장
        // =====================================================

        async function saveCurrentTrip() {

            return await saveTrip(
                currentTrip
            );

        }



        // =====================================================
        // 장소 추가
        // =====================================================

        async function addPlace() {

            const name =
                placeInput.value.trim();


            if (!name) {

                alert(
                    '장소를 입력해주세요.'
                );

                return;

            }


            addPlaceBtn.disabled =
                true;


            try {

                console.log(
                    '장소 검색:',
                    name
                );


                const url =
                    'https://nominatim.openstreetmap.org/search' +
                    '?format=json' +
                    '&limit=1' +
                    '&q=' +
                    encodeURIComponent(name);


                const response =
                    await fetch(
                        url,
                        {
                            headers: {
                                'Accept':
                                    'application/json'
                            }
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }


                const data =
                    await response.json();


                console.log(
                    '검색 결과:',
                    data
                );


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

                    id:
                        String(Date.now()),

                    name,

                    lat:
                        Number(result.lat),

                    lng:
                        Number(result.lon),

                    isLocked:
                        false

                };


                currentTrip.places.push(
                    newPlace
                );


                const success =
                    await saveCurrentTrip();


                if (!success) {

                    // 저장 실패하면 되돌림
                    currentTrip.places.pop();

                    return;

                }


                placeInput.value = '';

                renderPlaces();


            }
            catch (error) {

                console.error(
                    '장소 추가 오류:',
                    error
                );

                alert(
                    '장소 검색 중 오류가 발생했습니다.'
                );

            }
            finally {

                addPlaceBtn.disabled =
                    false;

            }

        }


        if (addPlaceBtn) {

            addPlaceBtn.addEventListener(
                'click',
                addPlace
            );

        }


        if (placeInput) {

            placeInput.addEventListener(
                'keydown',
                e => {

                    if (
                        e.key === 'Enter'
                    ) {

                        e.preventDefault();

                        addPlace();

                    }

                }
            );

        }



        // =====================================================
        // 드래그 정렬
        // =====================================================

        placesList.addEventListener(
            'dragover',
            e => {

                e.preventDefault();


                const dragging =
                    placesList.querySelector(
                        '.dragging'
                    );


                if (!dragging) return;


                const after =
                    getDragAfterElement(
                        placesList,
                        e.clientY
                    );


                if (!after) {

                    placesList.appendChild(
                        dragging
                    );

                }
                else {

                    placesList.insertBefore(
                        dragging,
                        after
                    );

                }

            }
        );


        function getDragAfterElement(
            container,
            y
        ) {

            const elements =
                [
                    ...container.querySelectorAll(
                        '.place-item:not(.dragging)'
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
                        offset > closest.offset
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



        async function updateOrder() {

            const items =
                placesList.querySelectorAll(
                    '.place-item'
                );


            const ids =
                [...items].map(
                    item =>
                        String(
                            item.dataset.id
                        )
                );


            const reordered = [];


            ids.forEach(id => {

                const found =
                    currentTrip.places.find(
                        p =>
                            String(p.id) === id
                    );


                if (found) {

                    reordered.push(
                        found
                    );

                }

            });


            if (
                reordered.length ===
                currentTrip.places.length
            ) {

                currentTrip.places =
                    reordered;

                await saveCurrentTrip();

                renderPlaces();

            }

        }



        // =====================================================
        // 경로 최적화
        // =====================================================

        if (optimizeBtn) {

            optimizeBtn.addEventListener(
                'click',
                optimizeRoute
            );

        }


        async function optimizeRoute() {

            const places =
                currentTrip.places;


            if (
                !places ||
                places.length < 2
            ) {

                alert(
                    '최적화할 장소가 2개 이상 필요합니다.'
                );

                return;

            }


            const unlocked =
                places.filter(
                    p => !p.isLocked
                );


            if (
                unlocked.length < 2
            ) {

                alert(
                    '잠금 해제된 장소가 2개 이상 필요합니다.'
                );

                return;

            }


            // 가장 단순하고 안정적인 최근접 이웃 방식
            const locked =
                places.filter(
                    p => p.isLocked
                );


            const unlockedCopy =
                [...unlocked];


            const result = [];


            // 첫 번째 장소
            let current =
                unlockedCopy.shift();


            result.push(current);


            while (
                unlockedCopy.length > 0
            ) {

                let nearestIndex = 0;
                let nearestDistance =
                    Infinity;


                for (
                    let i = 0;
                    i < unlockedCopy.length;
                    i++
                ) {

                    const distance =
                        calculateDistance(
                            current,
                            unlockedCopy[i]
                        );


                    if (
                        distance <
                        nearestDistance
                    ) {

                        nearestDistance =
                            distance;

                        nearestIndex =
                            i;

                    }

                }


                current =
                    unlockedCopy.splice(
                        nearestIndex,
                        1
                    )[0];


                result.push(
                    current
                );

            }


            // 잠긴 장소는 기존 위치 유지
            const finalRoute =
                new Array(
                    places.length
                ).fill(null);


            places.forEach(
                (p, index) => {

                    if (p.isLocked) {

                        finalRoute[index] =
                            p;

                    }

                }
            );


            let resultIndex = 0;


            for (
                let i = 0;
                i < finalRoute.length;
                i++
            ) {

                if (
                    finalRoute[i] === null
                ) {

                    finalRoute[i] =
                        result[resultIndex++];

                }

            }


            currentTrip.places =
                finalRoute;


            await saveCurrentTrip();

            renderPlaces();


            alert(
                '경로를 최적화했습니다!'
            );

        }



        function calculateDistance(
            a,
            b
        ) {

            const lat1 =
                Number(a.lat);

            const lng1 =
                Number(a.lng);

            const lat2 =
                Number(b.lat);

            const lng2 =
                Number(b.lng);


            if (
                !Number.isFinite(lat1) ||
                !Number.isFinite(lat2)
            ) {

                return Infinity;

            }


            const R = 6371;


            const dLat =
                toRad(lat2 - lat1);

            const dLng =
                toRad(lng2 - lng1);


            const x =
                Math.sin(dLat / 2) *
                Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);


            return (
                R *
                2 *
                Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                )
            );

        }


        function toRad(value) {

            return value *
                Math.PI /
                180;

        }



        // =====================================================
        // ★ 마지막으로 장소 렌더링
        // =====================================================

        renderPlaces();


        console.log(
            '===== 상세 페이지 초기화 완료 ====='
        );

    }



    // =========================================================
    // HTML escape
    // =========================================================

    function escapeHtml(value) {

        const div =
            document.createElement(
                'div'
            );

        div.textContent =
            value ?? '';

        return div.innerHTML;

    }

});
