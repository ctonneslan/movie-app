const API_KEY = "03739346ad2884d0783eed367fe05ce0";
const BASE_URL = "https://api.themoviedb.org/3";

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const movieInfo = document.getElementById("movie-info");
const recommendations = document.getElementById("recommendations");

let genreMap = {};

async function fetchGenres() {
  const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
  const data = await res.json();
  genreMap = data.genres.reduce((acc, genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});
}

// Call this once on page load
fetchGenres();

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    const movie = await searchMovie(query);
    if (movie) {
      displayMovieInfo(movie);
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

function displayMovieInfo(movie) {
  movieInfo.innerHTML = `
    <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}" alt="${
    movie.title
  } poster" />
    <div>
      <h2>${movie.title} (${new Date(movie.release_date).getFullYear()})</h2>
      <div class="genre-tags">
        ${movie.genre_ids
          .map((id) => `<span class="genre-tag">${genreMap[id]}</span>`)
          .join("")}
      </div>
      <p><strong>Rating:</strong> ${movie.vote_average}/10</p>
      <p>${movie.overview}</p>
    </div>
    <div style="clear: both;"></div>
  `;
}

function displayRecommendations(movies) {
  recommendations.innerHTML = movies
    .slice(0, 8)
    .map(
      (movie) => `
      <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" 
           alt="${movie.title}" 
           title="${movie.title}"
           onclick="handleRecClick(${movie.id})"
      />
    `
    )
    .join("");
}

async function handleRecClick(id) {
  const movie = await fetchMovieDetails(id);
  displayMovieInfo(movie);
  fetchRecommendations(id);
}
