import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDqAZiiw7SKc4SLSsWug1G3e_f5-u-pkYw",
    authDomain: "travel-planner-a9d51.firebaseapp.com",
    projectId: "travel-planner-a9d51",
    storageBucket: "travel-planner-a9d51.firebasestorage.app",
    messagingSenderId: "966221614343",
    appId: "1:966221614343:web:f48783ed75140a8be589a2",
    measurementId: "G-6RSREEXYS4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {


    
    // State
    //let trips = JSON.parse(localStorage.getItem('travelTrips')) || [];
    let trips = [];
    let currentTab = 'upcoming'; // 'upcoming' or 'past'
    let trip = {}; // Current trip for detail page

    let currentView = 'list'; // 'list' or 'calendar'
    let currentCalendarDate = new Date(); // Track currently displayed month

    // Determine current page
    const isIndexPage = !!document.getElementById('trip-list');
    const isAddPage = !!document.getElementById('add-btn');
    const isDetailPage = !!document.getElementById('map') && !!document.getElementById('places-list');

    if (isIndexPage) {
        initIndexPage();
    } else if (isAddPage) {
        initAddPage();
    } else if (isDetailPage) {
        initDetailPage();
    }

    // Index Page Logic
    function initIndexPage() {
        const tripList = document.getElementById('trip-list');
        const calendarView = document.getElementById('calendar-view');
        const emptyState = document.getElementById('empty-state');
        const totalTripsEl = document.getElementById('total-trips');
        const upcomingTripsEl = document.getElementById('upcoming-trips');
        const pastTripsEl = document.getElementById('past-trips');
        const tabBtns = document.querySelectorAll('.tab-btn');
        const viewBtns = document.querySelectorAll('.view-btn');
        const notificationBtn = document.getElementById('notification-btn');

        // Search Elements
        const searchNameInput = document.getElementById('search-name');
        const searchYearSelect = document.getElementById('search-year');
        const searchMonthSelect = document.getElementById('search-month');
        const searchBtn = document.getElementById('search-btn');

        // Populate Year Select
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i}년`;
            searchYearSelect.appendChild(option);
        }
        searchYearSelect.value = "";

        // // Initial Render
        // renderTrips();
        // updateStats();
        // Initial Render
        loadTrips().then(() => {
            renderTrips();
            updateStats();
        });

        // Event Listeners
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
                const title = btn.getAttribute('title');
                if (title.includes('리스트')) {
                    currentView = 'list';
                    tripList.style.display = 'flex';
                    calendarView.style.display = 'none';
                    viewBtns[0].classList.add('active');
                    viewBtns[1].classList.remove('active');
                    renderTrips();
                } else {
                    currentView = 'calendar';
                    tripList.style.display = 'none';
                    calendarView.style.display = 'flex';
                    viewBtns[0].classList.remove('active');
                    viewBtns[1].classList.add('active');
                    renderCalendar();
                }
            });
        });

        // Calendar Navigation
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');

        if (prevMonthBtn && nextMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                renderCalendar();
            });
            nextMonthBtn.addEventListener('click', () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                renderCalendar();
            });
        }

        // Notification Logic
        const notificationDropdown = document.getElementById('notification-dropdown');
        const notificationList = document.getElementById('notification-list');

        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');

            if (notificationDropdown.classList.contains('show')) {
                renderNotifications();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
                notificationDropdown.classList.remove('show');
            }
            if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });

        // Profile Dropdown Logic
        const profileBtn = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');

        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });

        function renderNotifications() {
            notificationList.innerHTML = '';
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const upcomingTrips = trips.filter(trip => {
                const start = new Date(trip.startDate || trip.date);
                start.setHours(0, 0, 0, 0);
                return start >= today;
            }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            if (upcomingTrips.length === 0) {
                notificationList.innerHTML = '<li class="empty-noti">새로운 알림이 없습니다.</li>';
                return;
            }

            upcomingTrips.forEach(trip => {
                const start = new Date(trip.startDate || trip.date);
                start.setHours(0, 0, 0, 0);

                const diffTime = start - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let dDayText = '';
                let badgeClass = '';

                if (diffDays === 0) {
                    dDayText = 'D-Day';
                    badgeClass = 'd-day-today';
                } else {
                    dDayText = `D-${diffDays}`;
                    badgeClass = 'd-day-upcoming';
                }

                const li = document.createElement('li');
                li.className = 'notification-item';
                li.innerHTML = `
                    <div class="noti-content">
                        <span class="d-day-badge ${badgeClass}">${dDayText}</span>
                        <span class="noti-text"><strong>${trip.destination}</strong> 여행이 다가옵니다.</span>
                    </div>
                `;
                li.onclick = () => {
                    goToDetail(trip.id);
                    notificationDropdown.classList.remove('show');
                };
                notificationList.appendChild(li);
            });
        }

        // Search Logic
        searchBtn.addEventListener('click', performSearch);
        searchNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        function performSearch() {
            const searchTerm = searchNameInput.value.trim().toLowerCase();
            const searchYear = searchYearSelect.value;
            const searchMonth = searchMonthSelect.value;

            // Helper to check if a trip matches search criteria
            const checkMatch = (trip) => {
                const start = trip.startDate || trip.date;
                const startDateObj = new Date(start);

                // Name Filter
                const nameMatch = trip.destination.toLowerCase().includes(searchTerm);

                // Year/Month Filter
                let yearMatch = true;
                if (searchYear) {
                    yearMatch = startDateObj.getFullYear().toString() === searchYear;
                }

                let monthMatch = true;
                if (searchMonth) {
                    monthMatch = (startDateObj.getMonth() + 1).toString() === searchMonth;
                }

                return nameMatch && yearMatch && monthMatch;
            };

            renderTrips(trips.filter(checkMatch));
        }

        function renderTrips(tripsToRender = trips) {
            tripList.innerHTML = '';
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let filteredTrips = tripsToRender.filter(trip => {
                const start = new Date(trip.startDate || trip.date);
                start.setHours(0, 0, 0, 0);
                if (currentTab === 'upcoming') return start >= today;
                return start < today;
            });

            // Sort
            filteredTrips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            if (currentTab === 'past') filteredTrips.reverse();

            if (filteredTrips.length === 0) {
                emptyState.style.display = 'flex';
                return;
            }
            emptyState.style.display = 'none';

            filteredTrips.forEach(trip => {
                const card = document.createElement('div');
                card.className = 'trip-card';
                card.innerHTML = `
                    <div class="trip-info">
                        <h3>${trip.destination}</h3>
                        <p>${trip.startDate} ~ ${trip.endDate}</p>
                    </div>
                    <button class="delete-trip-btn" onclick="deleteTrip('${trip.id}', event)">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
                card.onclick = (e) => {
                    // Prevent navigation if delete button was clicked (though stopPropagation handles it, this is extra safety)
                    if (!e.target.closest('.delete-trip-btn')) {
                        goToDetail(trip.id);
                    }
                };
                tripList.appendChild(card);
            });
        }

        window.deleteTrip = async function (id, event) {
            event.stopPropagation();
        
            if (!confirm('정말 이 여행 일정을 삭제하시겠습니까?')) {
                return;
            }
        
            try {
                await deleteDoc(doc(db, "trips", id));
        
                trips = trips.filter(t => t.id !== id);
        
                renderTrips();
                updateStats();
        
                alert('여행 일정이 삭제되었습니다.');
            } catch (error) {
                console.error("여행 일정 삭제 오류:", error);
                alert('여행 일정 삭제 중 오류가 발생했습니다.');
            }
        };


        function updateStats() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const upcoming = trips.filter(t => new Date(t.startDate) >= today).length;
            const past = trips.filter(t => new Date(t.startDate) < today).length;

            totalTripsEl.textContent = trips.length;
            upcomingTripsEl.textContent = upcoming;
            pastTripsEl.textContent = past;
        }

        function renderCalendar() {
            const grid = document.getElementById('calendar-grid');
            const monthDisplay = document.getElementById('current-month-display');
            grid.innerHTML = '';

            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            monthDisplay.textContent = `${year}년 ${month + 1}월`;

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startDay = firstDay.getDay();

            // Empty slots
            for (let i = 0; i < startDay; i++) {
                const div = document.createElement('div');
                div.className = 'calendar-day empty';
                grid.appendChild(div);
            }

            // Days
            for (let i = 1; i <= daysInMonth; i++) {
                const div = document.createElement('div');
                div.className = 'calendar-day';
                div.textContent = i;

                // Check for trips
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const daysTrips = trips.filter(t => {
                    return dateStr >= t.startDate && dateStr <= t.endDate;
                });

                if (daysTrips.length > 0) {
                    div.classList.add('has-trip');
                    daysTrips.forEach(trip => {
                        const label = document.createElement('div');
                        label.className = 'trip-label';
                        label.textContent = trip.destination;
                        label.title = trip.destination; // Tooltip for long names
                        div.appendChild(label);
                    });
                }

                grid.appendChild(div);
            }
        }
    }

    // Add Page Logic
    function initAddPage() {
        const addBtn = document.getElementById('add-btn');
        const destinationInput = document.getElementById('destination');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const activityInput = document.getElementById('activity');

        addBtn.addEventListener('click', async () => {
            const destination = destinationInput.value;
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            const activity = activityInput.value;

            if (!destination || !startDate || !endDate) {
                alert('필수 정보를 입력해주세요.');
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

            trips.push(newTrip);
            await saveTrips();
            window.location.href = 'index.html';
        });
    }

    // Detail Page Logic
    // Detail Page Logic
async function initDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    try {
        const tripDoc = await getDocs(collection(db, "trips"));

        const found = tripDoc.docs.find(docSnapshot => docSnapshot.id === tripId);

        if (!found) {
            alert('여행 정보를 찾을 수 없습니다.');
            window.location.href = 'index.html';
            return;
        }

        trip = {
            id: found.id,
            ...found.data()
        };

        trips = [trip];

    } catch (error) {
        console.error("여행 정보 불러오기 오류:", error);
        alert('여행 정보를 불러오는 중 오류가 발생했습니다.');
        window.location.href = 'index.html';
        return;
    }

    // 여기부터는 기존 코드 그대로
    document.getElementById('trip-title').textContent = trip.destination;
    document.getElementById('trip-dates').textContent = `${trip.startDate} ~ ${trip.endDate}`;

        const map = L.map('map').setView([37.5665, 126.9780], 10); // Default Seoul
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        const placeInput = document.getElementById('place-input');
        const addPlaceBtn = document.getElementById('add-place-btn');
        const placesList = document.getElementById('places-list');
        const optimizeBtn = document.getElementById('optimize-btn');

        renderPlaces();

        addPlaceBtn.addEventListener('click', async () => {
            const placeName = placeInput.value.trim();

            if (!placeName) return;

            try {
                // 장소 검색
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`
                );

                const data = await response.json();

                if (!data || data.length === 0) {
                    alert('장소를 찾을 수 없습니다.');
                    return;
                }

                const result = data[0];

                const newPlace = {
                    id: Date.now(),
                    name: placeName,
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    isLocked: false
                };

                if (!trip.places) {
                    trip.places = [];
                }

                // 장소 추가
                trip.places.push(newPlace);

                // Firestore에 저장
                await saveTrips();

                // 화면 갱신
                renderPlaces();

                placeInput.value = '';

                console.log('장소 저장 완료:', newPlace);

            } catch (error) {
                console.error('장소 추가 오류:', error);
                alert('장소 추가 중 오류가 발생했습니다.');
            }
        });

        optimizeBtn.addEventListener('click', () => {
            if (!trip.places || trip.places.length < 2) {
                alert('최적화할 장소가 2개 이상 필요합니다.');
                return;
            }

            const originalOrderJSON = JSON.stringify(trip.places.map(p => p.id));

            // Smart Optimization with Simulated Annealing
            const places = [...trip.places];
            const lockedPlaces = [];
            const unlockedPlaces = [];

            // Separate locked and unlocked
            places.forEach((p, i) => {
                if (p.isLocked) {
                    lockedPlaces.push({ place: p, index: i });
                } else {
                    unlockedPlaces.push(p);
                }
            });

            // If no unlocked places, nothing to do
            if (unlockedPlaces.length < 2) {
                alert('최적화할 수 있는(잠금 해제된) 장소가 부족합니다.');
                return;
            }

            // Helper to reconstruct full path
            function reconstructPath(currentUnlocked) {
                const fullPath = new Array(places.length).fill(null);
                lockedPlaces.forEach(lp => fullPath[lp.index] = lp.place);
                let uIdx = 0;
                for (let i = 0; i < fullPath.length; i++) {
                    if (!fullPath[i]) {
                        fullPath[i] = currentUnlocked[uIdx++];
                    }
                }
                return fullPath;
            }

            function calculateTotalDistance(route) {
                let dist = 0;
                for (let i = 0; i < route.length - 1; i++) {
                    dist += L.latLng(route[i].lat, route[i].lng).distanceTo(L.latLng(route[i + 1].lat, route[i + 1].lng));
                }
                return dist;
            }

            // Initial Solution: Nearest Neighbor on unlocked items relative to fixed slots
            // (Simplified: just shuffle unlocked for SA start, or keep current)
            let currentSolution = [...unlockedPlaces];
            let currentFullRoute = reconstructPath(currentSolution);
            let currentDist = calculateTotalDistance(currentFullRoute);

            // Simulated Annealing Parameters
            let temp = 10000;
            let coolingRate = 0.995;
            let bestSolution = [...currentSolution];
            let bestDist = currentDist;

            for (let i = 0; i < 2500; i++) {
                // Generate Neighbor
                let newSolution = [...currentSolution];

                // Random Swap or Reversal
                if (Math.random() < 0.8 && newSolution.length > 2) {
                    // 2-Opt Reversal
                    const idx1 = Math.floor(Math.random() * newSolution.length);
                    const idx2 = Math.floor(Math.random() * newSolution.length);
                    const start = Math.min(idx1, idx2);
                    const end = Math.max(idx1, idx2);
                    const section = newSolution.slice(start, end + 1).reverse();
                    newSolution.splice(start, section.length, ...section);
                } else {
                    // Swap
                    const idx1 = Math.floor(Math.random() * newSolution.length);
                    const idx2 = Math.floor(Math.random() * newSolution.length);
                    [newSolution[idx1], newSolution[idx2]] = [newSolution[idx2], newSolution[idx1]];
                }

                const newFullRoute = reconstructPath(newSolution);
                const newDist = calculateTotalDistance(newFullRoute);

                // Acceptance Probability
                if (newDist < currentDist || Math.random() < Math.exp((currentDist - newDist) / temp)) {
                    currentSolution = newSolution;
                    currentDist = newDist;

                    if (newDist < bestDist) {
                        bestSolution = [...newSolution];
                        bestDist = newDist;
                    }
                }

                temp *= coolingRate;
            }

            // Apply Best Solution
            const finalFullRoute = reconstructPath(bestSolution);

            // Check if order changed
            const newOrderJSON = JSON.stringify(finalFullRoute.map(p => p.id));

            // Calculate Total Distance
            const distKm = (bestDist / 1000).toFixed(1);

            place.isLocked = !place.isLocked;
            saveTrips();
            renderPlaces();

            if (originalOrderJSON === newOrderJSON) {
                alert(`이미 최적의 경로입니다! (총 거리: ${distKm}km)`);
            } else {
                alert(`경로를 최적화했습니다! (총 거리: ${distKm}km)`);
            }
        });

        window.toggleLock = async function (id) {
            const place = trip.places.find(p => p.id === id);
        
            if (place) {
                place.isLocked = !place.isLocked;
                await saveTrips();
                renderPlaces();
            }
        };

        function renderPlaces() {
            placesList.innerHTML = '';

            // Clear markers (simple way: remove all layers and re-add tile)
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                    map.removeLayer(layer);
                }
            });

            if (!trip.places || trip.places.length === 0) {
                placesList.innerHTML = '<div class="empty-places"><p>방문할 장소를 추가해보세요!</p></div>';
                return;
            }

            const latlngs = [];

            trip.places.forEach((place, index) => {
                const item = document.createElement('div');
                item.className = `place-item ${place.isLocked ? 'locked' : ''}`;
                item.draggable = !place.isLocked; // Only unlocked items are draggable

                item.innerHTML = `
                    <span class="place-number">${index + 1}</span>
                    <span class="place-name">${place.name}</span>
                    <button class="lock-btn ${place.isLocked ? 'active' : ''}" onclick="toggleLock(${place.id})">
                        <i class="fa-solid ${place.isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
                    </button>
                    <button class="remove-place-btn" onclick="removePlace(${place.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;

                // Drag Events (only if unlocked)
                if (!place.isLocked) {
                    item.addEventListener('dragstart', () => item.classList.add('dragging'));
                    item.addEventListener('dragend', () => {
                        item.classList.remove('dragging');
                        updateOrder();
                    });
                }

                placesList.appendChild(item);

                // Add Marker
                L.marker([place.lat, place.lng]).addTo(map)
                    .bindPopup(`${index + 1}. ${place.name}`);

                latlngs.push([place.lat, place.lng]);
            });

            // Draw Polyline
            if (latlngs.length > 1) {
                L.polyline(latlngs, { color: 'blue' }).addTo(map);
                map.fitBounds(latlngs);
            } else if (latlngs.length === 1) {
                map.setView(latlngs[0], 13);
            }
        }

        // Drag Over Logic
        placesList.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(placesList, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                placesList.appendChild(draggable);
            } else {
                placesList.insertBefore(draggable, afterElement);
            }
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.place-item:not(.dragging):not(.locked)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        function updateOrder() {
            // Re-read DOM to update array
            // Note: This needs careful handling with locked items.
            // For simplicity, we assume drag only happens amongst unlocked items visually,
            // but we need to map back to the data structure.
            // A robust way is to rebuild the array from the DOM elements.

            const newPlaces = [];
            const items = placesList.querySelectorAll('.place-item');
            items.forEach(item => {
                // Find place by name/id? We need ID in DOM.
                // Let's assume we can find it.
                // Actually, simpler to just re-render for now or trust the visual order.
                // To do it right, we should attach ID to the element.
            });
        }

        window.removePlace = async function (id) {
            if (!confirm('이 장소를 삭제하시겠습니까?')) {
                return;
            }
        
            try {
                trip.places = trip.places.filter(p => p.id !== id);
        
                await saveTrips();
        
                renderPlaces();
        
                console.log('장소 삭제 완료');
            } catch (error) {
                console.error('장소 삭제 오류:', error);
                alert('장소 삭제 중 오류가 발생했습니다.');
            }
        };
    }

    async function loadTrips() {
        try {
            const querySnapshot = await getDocs(collection(db, "trips"));
    
            trips = [];
    
            querySnapshot.forEach((docSnapshot) => {
                trips.push({
                    id: docSnapshot.id,
                    ...docSnapshot.data()
                });
            });
    
            console.log("Firestore에서 일정 불러오기 완료:", trips);
        } catch (error) {
            console.error("Firestore 불러오기 오류:", error);
            alert("여행 일정을 불러오는 중 오류가 발생했습니다.");
        }
    }

    async function saveTrips() {
        try {
            for (const trip of trips) {
                if (trip.id && typeof trip.id === 'string') {
                    await updateDoc(doc(db, "trips", trip.id), {
                        destination: trip.destination,
                        startDate: trip.startDate,
                        endDate: trip.endDate,
                        activity: trip.activity,
                        places: trip.places || []
                    });
                } else {
                    const docRef = await addDoc(collection(db, "trips"), {
                        destination: trip.destination,
                        startDate: trip.startDate,
                        endDate: trip.endDate,
                        activity: trip.activity,
                        places: trip.places || []
                    });
    
                    trip.id = docRef.id;
                }
            }
    
            console.log("Firestore 저장 완료");
        } catch (error) {
            console.error("Firestore 저장 오류:", error);
            alert("여행 일정 저장 중 오류가 발생했습니다.");
        }
    }

    function goToDetail(id) {
        window.location.href = `trip_detail.html?id=${id}`;
    }
});
