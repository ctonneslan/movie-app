const API_KEY = "03739346ad2884d0783eed367fe05ce0";
const BASE_URL = "https://api.themoviedb.org/3";

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const movieInfo = document.getElementById("movie-info");
const recommendations = document.getElementById("recommendations");

let genreMap = {};

const suggestionsList = document.getElementById("suggestions");
let activeSuggestionIndex = -1;
let currentSuggestions = [];

searchInput.addEventListener("input", async () => {
  const query = searchInput.value.trim();
  if (query.length < 2) {
    clearSuggestions();
    return;
  }

  const suggestions = await fetchSuggestions(query);
  currentSuggestions = suggestions;
  renderSuggestions(suggestions);
});

searchInput.addEventListener("keydown", (e) => {
  if (suggestionsList.childElementCount === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (activeSuggestionIndex < currentSuggestions.length - 1) {
      activeSuggestionIndex++;
      updateActiveSuggestion();
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (activeSuggestionIndex > 0) {
      activeSuggestionIndex--;
      updateActiveSuggestion();
    }
  } else if (e.key === "Enter") {
    if (activeSuggestionIndex > -1) {
      e.preventDefault();
      selectSuggestion(activeSuggestionIndex);
    }
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) {
    clearSuggestions();
  }
});

async function fetchSuggestions(query) {
  const res = await fetch(
    `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      query
    )}`
  );
  const data = await res.json();
  return data.results.slice(0, 5);
}

function renderSuggestions(suggestions) {
  suggestionsList.innerHTML = "";
  activeSuggestionIndex = -1;

  suggestions.forEach((movie, index) => {
    const li = document.createElement("li");
    li.textContent = `${movie.title} (${new Date(
      movie.release_date || "2000-01-01"
    ).getFullYear()})`;
    li.addEventListener("click", () => selectSuggestion(index));
    suggestionsList.appendChild(li);
  });
}

function clearSuggestions() {
  suggestionsList.innerHTML = "";
  activeSuggestionIndex = -1;
  currentSuggestions = [];
}

function updateActiveSuggestion() {
  [...suggestionsList.children].forEach((li, i) => {
    li.classList.toggle("active", i === activeSuggestionIndex);
  });
}

async function selectSuggestion(index) {
  const movie = currentSuggestions[index];
  if (!movie) return;

  searchInput.value = movie.title;
  clearSuggestions();

  const credits = await fetchCredits(movie.id);
  displayMovieInfo(movie, credits);
  fetchRecommendations(movie.id);
}

async function fetchGenres() {
  const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
  const data = await res.json();
  genreMap = data.genres.reduce((acc, genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});
}

function getFavorites() {
  const favs = localStorage.getItem("favorites");
  return favs ? JSON.parse(favs) : [];
}

function saveFavorites(favorites) {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

// Call this once on page load
fetchGenres();

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    const movie = await searchMovie(query);
    if (movie) {
      const credits = await fetchCredits(movie.id);
      displayMovieInfo(movie, credits);
      fetchRecommendations(movie.id);
    } else {
      movieInfo.innerHTML = `<p>Movie not found.</p>`;
      recommendations.innerHTML = "";
    }
  }
});

async function searchMovie(query) {
  const res = await fetch(
    `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      query
    )}`
  );
  const data = await res.json();
  return data.results[0];
}

async function fetchMovieDetails(id) {
  const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`);
  return await res.json();
}

async function fetchRecommendations(id) {
  const res = await fetch(
    `${BASE_URL}/movie/${id}/recommendations?api_key=${API_KEY}`
  );
  const data = await res.json();
  displayRecommendations(data.results);
}

async function displayMovieInfo(movie, credits = null) {
  const genreIds =
    movie.genre_ids || (movie.genres ? movie.genres.map((g) => g.id) : []);

  // If credits not passed, fetch them inside here:
  if (!credits) {
    credits = await fetchCredits(movie.id);
  }

  // Extract top 5 cast
  const topCast = credits.cast.slice(0, 5);

  // Extract director(s) from crew
  const directors = credits.crew.filter((person) => person.job === "Director");

  movieInfo.innerHTML = `
    <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" alt="${
    movie.title
  } poster" />
    <div>
      <h2>${movie.title} (${new Date(movie.release_date).getFullYear()})</h2>
      <div class="genre-tags">
        ${genreIds
          .map((id) => `<span class="genre-tag">${genreMap[id]}</span>`)
          .join("")}
      </div>
      <p><strong>Rating:</strong> ${movie.vote_average}/10</p>
      <p>${movie.overview}</p>
      
      <div class="cast-crew">
        <h3>Director${directors.length > 1 ? "s" : ""}:</h3>
        <p>${directors.map((d) => d.name).join(", ")}</p>
        
        <h3>Top Cast:</h3>
        <ul>
          ${topCast
            .map((actor) => `<li>${actor.name} as ${actor.character}</li>`)
            .join("")}
        </ul>
      </div>

      <button onclick="playTrailer(${movie.id})">▶️ Watch Trailer</button>
      <button id="fav-btn">${
        isFavorite(movie.id) ? "Remove from Favorites" : "Add to Favorites"
      }</button>  
    </div>
    <div style="clear: both;"></div>
  `;

  // After innerHTML assignment in displayMovieInfo
  const favBtn = document.getElementById("fav-btn");
  favBtn.addEventListener("click", () => {
    if (isFavorite(movie.id)) {
      removeFavorite(movie.id);
      favBtn.textContent = "Add to Favorites";
    } else {
      addFavorite(movie);
      favBtn.textContent = "Remove from Favorites";
    }
  });
}

function displayRecommendations(movies) {
  recommendations.innerHTML = "";

  movies.slice(0, 8).forEach((movie) => {
    const img = document.createElement("img");
    img.src = `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
    img.alt = movie.title;
    img.title = movie.title;
    img.classList.add("rec-poster");

    img.addEventListener("click", async () => {
      const details = await fetchMovieDetails(movie.id);
      displayMovieInfo(details);
      fetchRecommendations(movie.id);
    });

    recommendations.appendChild(img);
  });
}

async function handleRecClick(id) {
  const movie = await fetchMovieDetails(id);
  const credits = await fetchCredits(movie.id);
  displayMovieInfo(movie, credits);
  fetchRecommendations(id);
}

window.handleRecClick = handleRecClick;

const trailerModal = document.getElementById("trailer-modal");
const trailerFrame = document.getElementById("trailer-frame");
const closeModal = document.querySelector(".close");

closeModal.onclick = function () {
  trailerModal.style.display = "none";
  trailerFrame.src = ""; // stop video
};

window.onclick = function (event) {
  if (event.target === trailerModal) {
    trailerModal.style.display = "none";
    trailerFrame.src = "";
  }
};

async function playTrailer(movieId) {
  const res = await fetch(
    `${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`
  );
  const data = await res.json();
  const trailer = data.results.find(
    (video) => video.type === "Trailer" && video.site === "YouTube"
  );

  if (trailer) {
    trailerFrame.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
    trailerModal.style.display = "block";
  } else {
    alert("Trailer not available.");
  }
}

async function fetchCredits(movieId) {
  const res = await fetch(
    `${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`
  );
  const data = await res.json();
  return data;
}

const favoritesList = document.getElementById("favorites-list");

function renderFavorites() {
  const favorites = getFavorites();
  favoritesList.innerHTML = "";

  favorites.forEach((movie) => {
    const li = document.createElement("li");
    li.textContent = movie.title;
    li.title = movie.title;

    // Click to load movie
    li.addEventListener("click", async () => {
      const details = await fetchMovieDetails(movie.id);
      const credits = await fetchCredits(movie.id);
      displayMovieInfo(details, credits);
      fetchRecommendations(movie.id);
    });

    // Remove button
    const removeBtn = document.createElement("span");
    removeBtn.textContent = "✕";
    removeBtn.classList.add("remove-fav");
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFavorite(movie.id);
    });

    li.appendChild(removeBtn);
    favoritesList.appendChild(li);
  });
}

function addFavorite(movie) {
  const favorites = getFavorites();

  if (!favorites.find((fav) => fav.id === movie.id)) {
    favorites.push({ id: movie.id, title: movie.title });
    saveFavorites(favorites);
    renderFavorites();
  }
}

function removeFavorite(id) {
  let favorites = getFavorites();
  favorites = favorites.filter((fav) => fav.id !== id);
  saveFavorites(favorites);
  renderFavorites();
}

function isFavorite(id) {
  const favorites = getFavorites();
  return favorites.some((fav) => fav.id === id);
}

renderFavorites();
