let map = L.map("map").setView([20.5937, 78.9629], 5); // Default India
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

let marker, trail;
let watchId = null;

// Start sharing
document.getElementById("sendBtn").addEventListener("click", async () => {
  await fetch("/start-sharing", { method: "POST" });

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(async (pos) => {
      let lat = pos.coords.latitude;
      let lng = pos.coords.longitude;

      await fetch("/send-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(map).bindPopup("You are here").openPopup();

      if (!trail) trail = L.polyline([], { color: "red" }).addTo(map);
      trail.addLatLng([lat, lng]);

      map.setView([lat, lng], 15);
    });
  } else {
    alert("Geolocation not supported!");
  }
});

// Stop sharing
document.getElementById("stopBtn").addEventListener("click", async () => {
  await fetch("/stop-sharing", { method: "POST" });
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  alert("Sharing stopped!");
});

// Delete history
document.getElementById("deleteBtn").addEventListener("click", async () => {
  await fetch("/delete-history", { method: "POST" });
  if (trail) {
    map.removeLayer(trail);
    trail = null;
  }
  alert("History deleted!");
});
