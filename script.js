if (!window.travelPlannerInitialized) {
    window.travelPlannerInitialized = true;

    document.addEventListener('DOMContentLoaded', () => {
        const db = window.db;

        if (!db) {
            console.error('Firebase Firestore 연결 실패:', window.db);
            alert('Firebase 연결을 확인해주세요.');
            return;
        }

        console.log('Firebase Firestore 연결 성공');

        let trips = [];
        let currentTab = 'upcoming';
        let currentView = 'list';
        let currentCalendarDate = new Date();
        let currentTrip = null;

        const isDetailPage = document.getElementById('map') && document.getElementById('places-list');
        const isAddPage = document.getElementById('add-btn');
        const isIndexPage = document.getElementById('trip-list');

        if (isDetailPage) {
            initDetailPage();
        } else if (isAddPage) {
            initAddPage();
        } else if (isIndexPage) {
            initIndexPage();
        }

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
                        places: Array.isArray(data.places) ? data.places : []
                    };
                });

                console.log('Firestore 여행 데이터:', trips);
                return trips;
            } catch (error) {
                console.error('Firestore 불러오기 실패:', error);
                alert('Firestore에서 여행 정보를 불러오지 못했습니다.');
                trips = [];
                return [];
            }
        }

        async function saveTrip(trip) {
            if (!trip) {
                console.error('저장할 여행이 없습니다.');
                return false;
            }

            try {
                const id = String(trip.id);

                await db.collection('trips').doc(id).set({
                    id: trip.id,
                    destination: trip.destination || '',
                    startDate: trip.startDate || '',
                    endDate: trip.endDate || '',
                    activity: trip.activity || '',
                    places: Array.isArray(trip.places) ? trip.places : []
                }, { merge: true });

                console.log('여행 저장 완료:', id);
                return true;
            } catch (error) {
                console.error('여행 저장 실패:', error);
                alert('여행 저장에 실패했습니다.');
                return false;
            }
        }

        function initIndexPage() {
            const tripList = document.getElementById('trip-list');
            const calendarView = document.getElementById('calendar-view');
            const emptyState = document.getElementById('empty-state');
            const totalTripsEl = document.getElementById('total-trips');
            const upcomingTripsEl = document.getElementById('upcoming-trips');
            const pastTripsEl = document.getElementById('past-trips');
            const tabBtns = document.querySelectorAll('.tab-btn');
            const viewBtns = document.querySelectorAll('.view-btn');
            const searchNameInput = document.getElementById('search-name');
            const searchYearSelect = document.getElementById('search-year');
            const searchMonthSelect = document.getElementById('search-month');
            const searchBtn = document.getElementById('search-btn');

            if (searchYearSelect && searchYearSelect.options.length <= 1) {
                const currentYear = new Date().getFullYear();

                for (let year = currentYear - 5; year <= currentYear + 5; year++) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = `${year}년`;
                    searchYearSelect.appendChild(option);
                }
            }

            loadTrips().then(() => {
                renderTrips();
                updateStats();
            });

            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    tabBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentTab = btn.dataset.tab;
                    renderTrips();
                });
            });

            viewBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const title = btn.getAttribute('title') || '';

                    if (title.includes('리스트')) {
                        currentView = 'list';

                        if (tripList) tripList.style.display = 'flex';
                        if (calendarView) calendarView.style.display = 'none';

                        if (viewBtns[0]) viewBtns[0].classList.add('active');
                        if (viewBtns[1]) viewBtns[1].classList.remove('active');

                        renderTrips();
                    } else {
                        currentView = 'calendar';

                        if (tripList) tripList.style.display = 'none';
                        if (calendarView) calendarView.style.display = 'flex';

                        if (viewBtns[0]) viewBtns[0].classList.remove('active');
                        if (viewBtns[1]) viewBtns[1].classList.add('active');

                        renderCalendar();
                    }
                });
            });

            if (searchBtn) {
                searchBtn.addEventListener('click', performSearch);
            }

            if (searchNameInput) {
                searchNameInput.addEventListener('keypress', e => {
                    if (e.key === 'Enter') performSearch();
                });
            }

            function performSearch() {
                const term = searchNameInput ? searchNameInput.value.trim().toLowerCase() : '';
                const year = searchYearSelect ? searchYearSelect.value : '';
                const month = searchMonthSelect ? searchMonthSelect.value : '';

                const filtered = trips.filter(t => {
                    const date = new Date(t.startDate);

                    const nameMatch = (t.destination || '').toLowerCase().includes(term);
                    const yearMatch = !year || String(date.getFullYear()) === String(year);
                    const monthMatch = !month || String(date.getMonth() + 1) === String(month);

                    return nameMatch && yearMatch && monthMatch;
                });

                renderTrips(filtered);
            }

            function renderTrips(tripsToRender = trips) {
                if (!tripList) return;

                tripList.querySelectorAll('.trip-card').forEach(card => card.remove());

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let filtered = tripsToRender.filter(t => {
                    const start = new Date(t.startDate);
                    start.setHours(0, 0, 0, 0);

                    return currentTab === 'upcoming' ? start >= today : start < today;
                });

                filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

                if (currentTab === 'past') filtered.reverse();

                if (filtered.length === 0) {
                    if (emptyState) emptyState.style.display = 'flex';
                    return;
                }

                if (emptyState) emptyState.style.display = 'none';

                filtered.forEach(t => {
                    const card = document.createElement('div');
                    card.className = 'trip-card';

                    card.innerHTML = `
                        <div class="trip-info">
                            <h3>${escapeHtml(t.destination)}</h3>
                            <p>${escapeHtml(t.startDate)} ~ ${escapeHtml(t.endDate)}</p>
                        </div>
                        <button class="delete-trip-btn" type="button">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    `;

                    const deleteBtn = card.querySelector('.delete-trip-btn');

                    deleteBtn.addEventListener('click', async e => {
                        e.stopPropagation();
                        await deleteTrip(t.id);
                    });

                    card.addEventListener('click', () => {
                        window.location.href = `trip_detail.html?id=${encodeURIComponent(String(t.id))}`;
                    });

                    tripList.appendChild(card);
                });
            }

            async function deleteTrip(id) {
                if (!confirm('정말 이 여행 일정을 삭제하시겠습니까?')) return;

                try {
                    await db.collection('trips').doc(String(id)).delete();

                    trips = trips.filter(t => String(t.id) !== String(id));

                    renderTrips();
                    updateStats();
                } catch (error) {
                    console.error('삭제 실패:', error);
                    alert('여행 삭제에 실패했습니다.');
                }
            }

            function updateStats() {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const upcoming = trips.filter(t => {
                    const date = new Date(t.startDate);
                    date.setHours(0, 0, 0, 0);
                    return date >= today;
                }).length;

                const past = trips.filter(t => {
                    const date = new Date(t.startDate);
                    date.setHours(0, 0, 0, 0);
                    return date < today;
                }).length;

                if (totalTripsEl) totalTripsEl.textContent = trips.length;
                if (upcomingTripsEl) upcomingTripsEl.textContent = upcoming;
                if (pastTripsEl) pastTripsEl.textContent = past;
            }

            function renderCalendar() {
                const grid = document.getElementById('calendar-grid');
                const monthDisplay = document.getElementById('current-month-display');

                if (!grid) return;

                grid.innerHTML = '';

                const year = currentCalendarDate.getFullYear();
                const month = currentCalendarDate.getMonth();

                if (monthDisplay) {
                    monthDisplay.textContent = `${year}년 ${month + 1}월`;
                }

                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const daysInMonth = lastDay.getDate();
                const startDay = firstDay.getDay();

                for (let i = 0; i < startDay; i++) {
                    const empty = document.createElement('div');
                    empty.className = 'calendar-day empty';
                    grid.appendChild(empty);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    const div = document.createElement('div');
                    div.className = 'calendar-day';

                    const number = document.createElement('span');
                    number.textContent = day;
                    div.appendChild(number);

                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    const dayTrips = trips.filter(t =>
                        dateStr >= t.startDate && dateStr <= t.endDate
                    );

                    dayTrips.forEach(t => {
                        const label = document.createElement('div');
                        label.className = 'trip-label';
                        label.textContent = t.destination;
                        div.appendChild(label);
                    });

                    grid.appendChild(div);
                }
            }

            const prev = document.getElementById('prev-month');
            const next = document.getElementById('next-month');

            if (prev) {
                prev.addEventListener('click', () => {
                    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                    renderCalendar();
                });
            }

            if (next) {
                next.addEventListener('click', () => {
                    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                    renderCalendar();
                });
            }
        }

        function initAddPage() {
            const addBtn = document.getElementById('add-btn');

            if (!addBtn || addBtn.dataset.initialized === 'true') return;

            addBtn.dataset.initialized = 'true';

            const destination = document.getElementById('destination');
            const startDate = document.getElementById('start-date');
            const endDate = document.getElementById('end-date');
            const activity = document.getElementById('activity');

            let isSaving = false;

            addBtn.addEventListener('click', async () => {
                if (isSaving) return;

                const destinationValue = destination ? destination.value.trim() : '';
                const startValue = startDate ? startDate.value : '';
                const endValue = endDate ? endDate.value : '';
                const activityValue = activity ? activity.value.trim() : '';

                if (!destinationValue || !startValue || !endValue) {
                    alert('필수 정보를 입력해주세요.');
                    return;
                }

                if (endValue < startValue) {
                    alert('종료일은 시작일보다 빠를 수 없습니다.');
                    return;
                }

                isSaving = true;
                addBtn.disabled = true;

                const originalText = addBtn.innerHTML;
                addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';

                const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

                const newTrip = {
                    id,
                    destination: destinationValue,
                    startDate: startValue,
                    endDate: endValue,
                    activity: activityValue,
                    places: []
                };

                try {
                    const success = await saveTrip(newTrip);

                    if (success) {
                        window.location.href = 'index.html';
                        return;
                    }
                } finally {
                    isSaving = false;
                    addBtn.disabled = false;
                    addBtn.innerHTML = originalText;
                }
            });
        }

        async function initDetailPage() {
            if (typeof L === 'undefined') {
                console.error('Leaflet이 로드되지 않았습니다.');
                alert('지도 라이브러리를 불러오지 못했습니다.');
                return;
            }

            const params = new URLSearchParams(window.location.search);
            const tripId = params.get('id');

            if (!tripId) {
                alert('여행 ID가 없습니다.');
                window.location.href = 'index.html';
                return;
            }

            try {
                const doc = await db.collection('trips').doc(String(tripId)).get();

                if (!doc.exists) {
                    alert('여행 정보를 찾을 수 없습니다.');
                    window.location.href = 'index.html';
                    return;
                }

                const data = doc.data();

                currentTrip = {
                    id: String(doc.id),
                    destination: data.destination || data.name || '',
                    startDate: data.startDate || data.date || '',
                    endDate: data.endDate || data.startDate || data.date || '',
                    activity: data.activity || '',
                    places: Array.isArray(data.places) ? data.places : []
                };
            } catch (error) {
                console.error('여행 조회 실패:', error);
                alert('여행 정보를 불러오지 못했습니다.');
                return;
            }

            const title = document.getElementById('trip-title');
            const dates = document.getElementById('trip-dates');
            const placeInput = document.getElementById('place-input');
            const addPlaceBtn = document.getElementById('add-place-btn');
            const placesList = document.getElementById('places-list');
            const optimizeBtn = document.getElementById('optimize-btn');
            const mapElement = document.getElementById('map');

            if (title) title.textContent = currentTrip.destination;
            if (dates) dates.textContent = `${currentTrip.startDate} ~ ${currentTrip.endDate}`;

            if (!mapElement) {
                console.error('#map 요소가 없습니다.');
                alert('지도 영역을 찾을 수 없습니다.');
                return;
            }

            const map = L.map(mapElement).setView([37.5665, 126.9780], 10);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            setTimeout(() => map.invalidateSize(), 300);

            function renderPlaces() {
                if (!placesList) return;

                placesList.innerHTML = '';

                map.eachLayer(layer => {
                    if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                        map.removeLayer(layer);
                    }
                });

                if (!currentTrip.places || currentTrip.places.length === 0) {
                    placesList.innerHTML = `
                        <div class="empty-places">
                            <p>방문할 장소를 추가해보세요!</p>
                        </div>
                    `;
                    return;
                }

                const latlngs = [];

                currentTrip.places.forEach((place, index) => {
                    const item = document.createElement('div');

                    item.className = 'place-item' + (place.isLocked ? ' locked' : '');
                    item.dataset.id = String(place.id);
                    item.draggable = !place.isLocked;

                    item.innerHTML = `
                        <span class="place-number">${index + 1}</span>
                        <span class="place-name">${escapeHtml(place.name)}</span>
                        <button class="lock-btn ${place.isLocked ? 'active' : ''}" type="button">
                            <i class="fa-solid ${place.isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
                        </button>
                        <button class="remove-place-btn" type="button">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    `;

                    const lockBtn = item.querySelector('.lock-btn');

                    lockBtn.addEventListener('click', async e => {
                        e.stopPropagation();

                        place.isLocked = !place.isLocked;

                        await saveCurrentTrip();
                        renderPlaces();
                    });

                    const removeBtn = item.querySelector('.remove-place-btn');

                    removeBtn.addEventListener('click', async e => {
                        e.stopPropagation();

                        if (!confirm(`"${place.name}" 장소를 삭제할까요?`)) return;

                        currentTrip.places = currentTrip.places.filter(
                            p => String(p.id) !== String(place.id)
                        );

                        await saveCurrentTrip();
                        renderPlaces();
                    });

                    if (!place.isLocked) {
                        item.addEventListener('dragstart', () => {
                            item.classList.add('dragging');
                        });

                        item.addEventListener('dragend', async () => {
                            item.classList.remove('dragging');
                            await updateOrder();
                        });
                    }

                    placesList.appendChild(item);

                    const lat = Number(place.lat);
                    const lng = Number(place.lng);

                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                        L.marker([lat, lng])
                            .addTo(map)
                            .bindPopup(`${index + 1}. ${escapeHtml(place.name)}`);

                        latlngs.push([lat, lng]);
                    }
                });

                if (latlngs.length > 1) {
                    L.polyline(latlngs).addTo(map);
                    map.fitBounds(latlngs, { padding: [40, 40] });
                } else if (latlngs.length === 1) {
                    map.setView(latlngs[0], 14);
                }
            }

            async function saveCurrentTrip() {
                return await saveTrip(currentTrip);
            }

            async function addPlace() {
                if (!placeInput || !addPlaceBtn) return;

                const name = placeInput.value.trim();

                if (!name) {
                    alert('장소를 입력해주세요.');
                    return;
                }

                if (addPlaceBtn.disabled) return;

                addPlaceBtn.disabled = true;

                try {
                    const url =
                        'https://nominatim.openstreetmap.org/search' +
                        '?format=json&limit=1&q=' +
                        encodeURIComponent(name);

                    const response = await fetch(url, {
                        headers: {
                            Accept: 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = await response.json();

                    if (!data || data.length === 0) {
                        alert('장소를 찾을 수 없습니다.');
                        return;
                    }

                    const result = data[0];

                    const newPlace = {
                        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        name,
                        lat: Number(result.lat),
                        lng: Number(result.lon),
                        isLocked: false
                    };

                    currentTrip.places.push(newPlace);

                    const success = await saveCurrentTrip();

                    if (!success) {
                        currentTrip.places.pop();
                        return;
                    }

                    placeInput.value = '';
                    renderPlaces();
                } catch (error) {
                    console.error('장소 추가 오류:', error);
                    alert('장소 검색 중 오류가 발생했습니다.');
                } finally {
                    addPlaceBtn.disabled = false;
                }
            }

            if (addPlaceBtn && addPlaceBtn.dataset.initialized !== 'true') {
                addPlaceBtn.dataset.initialized = 'true';
                addPlaceBtn.addEventListener('click', addPlace);
            }

            if (placeInput && placeInput.dataset.initialized !== 'true') {
                placeInput.dataset.initialized = 'true';

                placeInput.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addPlace();
                    }
                });
            }

            if (placesList && placesList.dataset.initialized !== 'true') {
                placesList.dataset.initialized = 'true';

                placesList.addEventListener('dragover', e => {
                    e.preventDefault();

                    const dragging = placesList.querySelector('.dragging');
                    if (!dragging) return;

                    const after = getDragAfterElement(placesList, e.clientY);

                    if (!after) {
                        placesList.appendChild(dragging);
                    } else {
                        placesList.insertBefore(dragging, after);
                    }
                });
            }

            function getDragAfterElement(container, y) {
                const elements = [
                    ...container.querySelectorAll('.place-item:not(.dragging)')
                ];

                let closest = {
                    offset: Number.NEGATIVE_INFINITY,
                    element: null
                };

                elements.forEach(child => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;

                    if (offset < 0 && offset > closest.offset) {
                        closest = {
                            offset,
                            element: child
                        };
                    }
                });

                return closest.element;
            }

            async function updateOrder() {
                const items = placesList.querySelectorAll('.place-item');

                const ids = [...items].map(item =>
                    String(item.dataset.id)
                );

                const reordered = [];

                ids.forEach(id => {
                    const found = currentTrip.places.find(
                        p => String(p.id) === id
                    );

                    if (found) reordered.push(found);
                });

                if (reordered.length === currentTrip.places.length) {
                    currentTrip.places = reordered;
                    await saveCurrentTrip();
                    renderPlaces();
                }
            }

            if (optimizeBtn && optimizeBtn.dataset.initialized !== 'true') {
                optimizeBtn.dataset.initialized = 'true';
                optimizeBtn.addEventListener('click', optimizeRoute);
            }

            async function optimizeRoute() {
                const places = currentTrip.places;

                if (!places || places.length < 2) {
                    alert('최적화할 장소가 2개 이상 필요합니다.');
                    return;
                }

                const unlocked = places.filter(p => !p.isLocked);

                if (unlocked.length < 2) {
                    alert('잠금 해제된 장소가 2개 이상 필요합니다.');
                    return;
                }

                const unlockedCopy = [...unlocked];
                const result = [];

                let current = unlockedCopy.shift();
                result.push(current);

                while (unlockedCopy.length > 0) {
                    let nearestIndex = 0;
                    let nearestDistance = Infinity;

                    for (let i = 0; i < unlockedCopy.length; i++) {
                        const distance = calculateDistance(
                            current,
                            unlockedCopy[i]
                        );

                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearestIndex = i;
                        }
                    }

                    current = unlockedCopy.splice(nearestIndex, 1)[0];
                    result.push(current);
                }

                const finalRoute = new Array(places.length).fill(null);

                places.forEach((p, index) => {
                    if (p.isLocked) {
                        finalRoute[index] = p;
                    }
                });

                let resultIndex = 0;

                for (let i = 0; i < finalRoute.length; i++) {
                    if (finalRoute[i] === null) {
                        finalRoute[i] = result[resultIndex++];
                    }
                }

                currentTrip.places = finalRoute;

                await saveCurrentTrip();
                renderPlaces();

                alert('경로를 최적화했습니다!');
            }

            function calculateDistance(a, b) {
                const lat1 = Number(a.lat);
                const lng1 = Number(a.lng);
                const lat2 = Number(b.lat);
                const lng2 = Number(b.lng);

                if (!Number.isFinite(lat1) || !Number.isFinite(lat2)) {
                    return Infinity;
                }

                const R = 6371;
                const dLat = toRad(lat2 - lat1);
                const dLng = toRad(lng2 - lng1);

                const x =
                    Math.sin(dLat / 2) ** 2 +
                    Math.cos(toRad(lat1)) *
                    Math.cos(toRad(lat2)) *
                    Math.sin(dLng / 2) ** 2;

                return R * 2 * Math.atan2(
                    Math.sqrt(x),
                    Math.sqrt(1 - x)
                );
            }

            function toRad(value) {
                return value * Math.PI / 180;
            }

            renderPlaces();
        }

        function escapeHtml(value) {
            const div = document.createElement('div');
            div.textContent = value ?? '';
            return div.innerHTML;
        }
    });
}
