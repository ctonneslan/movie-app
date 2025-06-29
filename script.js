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
    </div>
    <div style="clear: both;"></div>
  `;
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
