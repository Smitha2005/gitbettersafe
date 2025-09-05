const socket = io();
const trackBtn = document.getElementById('trackBtn');
const userIdEl = document.getElementById('userId');
const statusEl = document.getElementById('status');

let map = L.map('map').setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let marker = null, circle = null, polyline = null;
let currentTrackingId = null;

function setStatus(t) { statusEl.innerText = 'Status: ' + t; }

function clearMap() {
  if (polyline) { polyline.remove(); polyline = null; }
  if (marker) { marker.remove(); marker = null; }
  if (circle) { circle.remove(); circle = null; }
}

function drawHistory(history) {
  clearMap();
  if (!history || history.length === 0) {
    setStatus(`No history for ${currentTrackingId}. Waiting for live updates.`);
    return;
  }

  const latlngs = history.map(p => [p.lat, p.lng]);
  polyline = L.polyline(latlngs, { color: 'red' }).addTo(map);
  map.fitBounds(polyline.getBounds());

  const lastPoint = history[history.length - 1];
  updateMarker(lastPoint, false);
  setStatus(`Tracking ${currentTrackingId}. Last update: ${new Date(lastPoint.ts).toLocaleString()}`);
}

function updateMarker(data, isLive = true) {
    const { lat, lng, acc, ts, note } = data;
    if (note === 'stopped' || lat === null || lng === null) {
        setStatus(`Sender ${currentTrackingId} has stopped tracking.`);
        return;
    }

    const accuracyInMeters = Math.round(acc);
    const accuracyText = `(±${accuracyInMeters}m)`;

    if (!marker) {
        marker = L.marker([lat, lng]).addTo(map);
        // Add a permanent tooltip to the marker
        marker.bindTooltip(accuracyText, { permanent: true, direction: 'top', offset: [0, -20] }).openTooltip();
    } else {
        marker.setLatLng([lat, lng]);
        // Update the tooltip content
        marker.setTooltipContent(accuracyText);
    }

    // Make the accuracy circle more prominent
    if (!circle) circle = L.circle([lat, lng], { radius: acc, color: '#03a9f4', weight: 2, fillOpacity: 0.2 }).addTo(map);
    else { circle.setLatLng([lat, lng]); circle.setRadius(acc); }

    if (isLive && polyline) {
        polyline.addLatLng([lat, lng]);
    }
    
    // Zoom to fit the accuracy circle if it's the first update
    if (!isLive || map.getZoom() < 15) {
        map.fitBounds(circle.getBounds());
    }
    
    // Display accuracy in the status message
    setStatus(`Tracking ${currentTrackingId}. Last update: ${new Date(ts).toLocaleString()} (Accuracy: ${accuracyInMeters}m)`);
}

// Assumes receiver.html has an input with id="userId" and a button with id="trackBtn"
trackBtn.onclick = async () => {
  const userId = (userIdEl.value || 'alice').trim();
  if (currentTrackingId === userId) return;

  currentTrackingId = userId;
  setStatus(`Fetching history for ${userId}...`);
  
  socket.emit('join_room', userId);

  try {
    const res = await fetch(`/history/${encodeURIComponent(userId)}`);
    const history = await res.json();
    drawHistory(history);
  } catch (err) {
    console.error('Failed to fetch history:', err);
    setStatus(`Error fetching history for ${userId}.`);
  }
};

socket.on('location_update', (data) => {
  if (data.userId === currentTrackingId) {
    updateMarker(data);
  }
});

socket.on('history_cleared', () => {
    if (currentTrackingId) {
        clearMap();
        setStatus(`History for ${currentTrackingId} was cleared by the sender. Waiting for new updates...`);
    }
});
