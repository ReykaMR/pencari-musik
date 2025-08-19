// ------------------ Konstanta & State ------------------
const API_SEARCH = 'https://api.deezer.com/search';
const API_CHART = 'https://api.deezer.com/chart/0/tracks';
const PAGE_SIZE = 12;
const MAX_HISTORY = 10;

let currentQuery = '';
let nextIndex = 0;
let resultsCache = [];
let currentIndex = -1;
let isPlaying = false;
let currentCardPlaying = null;
let currentPlayContext = 'search';
let currentTrackId = null;

let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let histories = JSON.parse(localStorage.getItem('histories') || '[]');

const $grid = $('#resultsGrid');
const $favGrid = $('#favGrid');
const $favEmpty = $('#favEmpty');
const $info = $('#resultInfo');
const $loadMore = $('#loadMoreBtn');
const $emptyState = $('#emptyState');
const $chartBanner = $('#chartBanner');
const $historyContainer = $('#historyContainer');

const audio = document.getElementById('audioEl');

let apiRequestCounter = 0;
function showGlobalLoading() {
    apiRequestCounter++;
    $('#globalLoader').removeClass('hidden');
}
function hideGlobalLoading() {
    apiRequestCounter = Math.max(0, apiRequestCounter - 1);
    if (apiRequestCounter === 0) {
        $('#globalLoader').addClass('hidden');
    }
}

// ------------------ Utility Functions ------------------
function showToast(message, type = 'success') {
    const id = 'toast-' + Date.now();
    const icon = type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check';
    const bg = type === 'error' ? 'bg-red-600' : 'bg-primary';

    const toast = $(
        `<div id="${id}" class="${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 fade-in">
                    <i class="fas ${icon} mt-0.5"></i>
                    <div>${message}</div>
                </div>`
    );

    $('#toastContainer').append(toast);

    setTimeout(() => {
        toast.fadeOut(400, () => toast.remove());
    }, 3000);
}

function formatDuration(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function fmtArtists(track) {
    return track.artist?.name || 'Unknown Artist';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Link disalin ke clipboard!'))
        .catch(() => showToast('Gagal menyalin link', 'error'));
}

// ------------------ History Management ------------------
function renderHistory() {
    const box = $('#historyBox').empty();
    if (histories.length === 0) {
        box.append('<span class="text-slate-500 text-xs py-2">Belum ada riwayat pencarian</span>');
        $('#clearHistoryBtn').hide();
        return;
    }

    $('#clearHistoryBtn').show();

    histories.forEach(h => {
        const wrap = $(`
                    <div class="flex-shrink-0 bg-slate-800 rounded-lg px-3 py-2 text-sm flex items-center">
                        <button class="history-item hover:text-primary transition flex-1 text-left">${h}</button>
                        <button class="remove-history-btn text-red-400 hover:text-red-300 ml-2" data-query="${h}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `);

        wrap.find('.history-item').on('click', () => {
            $('#searchInput').val(h);
            performSearch(h, true);
        });

        wrap.find('.remove-history-btn').on('click', function () {
            const query = $(this).data('query');
            removeHistory(query);
        });

        box.append(wrap);
    });
}

function addHistory(query) {
    histories = histories.filter(q => q !== query);
    histories.unshift(query);
    histories = histories.slice(0, MAX_HISTORY);
    localStorage.setItem('histories', JSON.stringify(histories));
    renderHistory();
}

function removeHistory(q) {
    histories = histories.filter(h => h !== q);
    localStorage.setItem('histories', JSON.stringify(histories));
    renderHistory();
    showToast('Riwayat dihapus');
}

// ------------------ Favorites Management ------------------
function isFav(id) {
    return favorites.some(f => f.id === id);
}

function toggleFav(track) {
    if (isFav(track.id)) {
        favorites = favorites.filter(f => f.id !== track.id);
        showToast('Dihapus dari Favorit');
    } else {
        favorites.push(track);
        showToast('Ditambahkan ke Favorit ❤️');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFav();
}

// ------------------ Rendering Functions ------------------
function showSkeletonLoader(count = 8) {
    $grid.empty();
    for (let i = 0; i < count; i++) {
        $grid.append($('#skeletonTemplate').prop('content').cloneNode(true));
    }
}

function updateCardPlayButtons() {
    $('.card-hover').each(function () {
        const $card = $(this);
        const id = $card.attr('data-track-id');
        const $btn = $card.find('.play-btn');

        $btn.prop('disabled', false);
        $btn.removeClass('opacity-60 cursor-not-allowed');
        $btn.html('<i class="fas fa-play mr-2"></i>Putar');

        if (currentTrackId && String(id) === String(currentTrackId)) {
            if (isPlaying && !audio.paused && !audio.ended) {
                $btn.html('<i class="fas fa-volume-up mr-2"></i>Sedang Diputar');
                $btn.prop('disabled', true);
                $btn.addClass('opacity-60 cursor-not-allowed');
            } else {
                $btn.html('<i class="fas fa-play mr-2"></i>Lanjutkan');
                $btn.prop('disabled', false);
                $btn.removeClass('opacity-60 cursor-not-allowed');
            }
        }
    });
}

function buildCard(track, indexInCache, context = 'search') {
    const tpl = document.getElementById('cardTemplate');
    const node = tpl.content.cloneNode(true);
    const $node = $(node);

    $node.find('img').attr('src', track.album?.cover_medium || '');
    $node.find('.title').text(track.title || 'Untitled');
    $node.find('.artist').text(fmtArtists(track));

    const duration = track.duration ? Math.floor(track.duration / 60) + ':' +
        (track.duration % 60 < 10 ? '0' : '') + track.duration % 60 : '0:30';
    $node.find('.duration').text(duration);

    $node.find('.card-hover').attr('data-track-id', track.id);

    $node.find('.play-btn').on('click', (e) => {
        e.stopPropagation();
        playTrack(track, context);
    });

    const favBtn = $node.find('.fav-btn');
    favBtn.find('i').toggleClass('fas far', isFav(track.id));
    if (isFav(track.id)) {
        favBtn.find('i').addClass('text-yellow-400');
    }

    favBtn.on('click', function (e) {
        e.stopPropagation();
        toggleFav(track);
        $(this).find('i')
            .toggleClass('fas far', isFav(track.id))
            .toggleClass('text-yellow-400', isFav(track.id));
    });

    $node.find('.share-btn').on('click', (e) => {
        e.stopPropagation();
        const deezerUrl = track.link || `https://www.deezer.com/track/${track.id}`;
        copyToClipboard(deezerUrl);
    });

    $node.find('.card-hover').on('click', () => playTrack(track, context));

    return node;
}

function renderFav() {
    $favGrid.empty();
    if (favorites.length === 0) {
        $favEmpty.show();
        return;
    }
    $favEmpty.hide();
    favorites.forEach((t) => $favGrid.append(buildCard(t, null, 'favorites')));
    setTimeout(updateCardPlayButtons, 0);
}

// ------------------ API Functions ------------------
function searchDeezer(query, index = 0) {
    showGlobalLoading();
    const req = $.ajax({
        url: API_SEARCH,
        dataType: 'jsonp',
        data: { q: query, index, limit: PAGE_SIZE, output: 'jsonp' },
        timeout: 10000
    });
    req.always(() => hideGlobalLoading());
    return req;
}

function fetchChart(limit = 20) {
    showGlobalLoading();
    const req = $.ajax({
        url: API_CHART,
        dataType: 'jsonp',
        data: { limit, output: 'jsonp' },
        timeout: 10000
    });
    req.always(() => hideGlobalLoading());
    return req;
}

async function loadTopChart() {
    try {
        $chartBanner.removeClass('hidden');
        showSkeletonLoader(8);

        const resp = await fetchChart(20);
        const tracks = resp?.data || [];

        resultsCache = tracks.slice();
        nextIndex = tracks.length;
        $grid.empty();

        if (tracks.length === 0) {
            $emptyState.show();
        } else {
            tracks.forEach((t, i) => $grid.append(buildCard(t, i, 'search')));
        }

        setTimeout(updateCardPlayButtons, 0);

        // $info.html('<i class="fas fa-chart-line mr-2 text-primary"></i>Top Chart Deezer');

        $loadMore.addClass('hidden');
    } catch (e) {
        console.error(e);
        $info.html('<i class="fas fa-exclamation-triangle mr-2 text-red-500"></i>Gagal memuat Top Chart');
        $emptyState.show();
        showToast('Gagal memuat Top Chart', 'error');
    }
}

async function performSearch(query, reset = true) {
    const q = query.trim();
    if (!q) {
        $info.html('<i class="fas fa-info-circle mr-2 text-primary"></i>Masukkan kata kunci pencarian');
        $loadMore.addClass('hidden');
        return;
    }

    $chartBanner.addClass('hidden');
    $historyContainer.show();

    if (reset) {
        currentQuery = q;
        nextIndex = 0;
        resultsCache = [];
        currentIndex = -1;
        $emptyState.hide();
        showSkeletonLoader(8);
        $loadMore.addClass('hidden');
    }

    try {
        const resp = await searchDeezer(currentQuery, nextIndex);
        const tracks = resp.data || [];

        if (reset) {
            $grid.empty();
        }

        if (tracks.length === 0 && reset) {
            $emptyState.show();
            $loadMore.addClass('hidden');
            $info.html(`<i class=\"fas fa-exclamation-triangle mr-2 text-amber-500\"></i>Tidak ada hasil untuk "${currentQuery}"`);
        } else {
            $emptyState.hide();
        }

        const startAt = resultsCache.length;
        resultsCache = [...resultsCache, ...tracks];
        nextIndex += tracks.length;

        tracks.forEach((t, i) => $grid.append(buildCard(t, startAt + i, 'search')));

        setTimeout(updateCardPlayButtons, 0);

        $info.html(`<i class="fas fa-search mr-2 text-primary"></i>Menampilkan ${resultsCache.length} hasil untuk "${currentQuery}"`);
        addHistory(currentQuery);

        if (tracks.length >= PAGE_SIZE) {
            $loadMore.removeClass('hidden');
        } else {
            $loadMore.addClass('hidden');
        }

    } catch (error) {
        console.error('Pencarian gagal:', error);
        $info.html(`<i class="fas fa-exclamation-triangle mr-2 text-red-500"></i>Pencarian gagal untuk "${currentQuery}"`);
        showToast('Gagal memuat hasil pencarian', 'error');
        $loadMore.addClass('hidden');
    }
}

// ------------------ Player Functions ------------------
function updatePlayerUI(track) {
    if (!track) return;

    $('#playerCard').removeClass('hidden');
    $('#playerCover').attr('src', track.album?.cover_medium || '');
    $('#playerTitle').text(track.title || '-');
    $('#playerArtist').text(fmtArtists(track));
    $('#totalTime').text('0:30');
}

function playTrack(track, context = 'search') {
    if (!track || !track.preview) {
        showToast('Preview tidak tersedia', 'error');
        return;
    }

    if (currentTrackId === track.id) {
        if (!audio.paused && !audio.ended) {
            showToast('Lagu sedang diputar');
            return;
        }
        if (audio.paused) {
            audio.play().then(() => {
                isPlaying = true;
                updatePlayPauseIcon();
                updateCardPlayButtons();
                showToast('Diteruskan');
            }).catch(e => {
                console.error('Gagal melanjutkan:', e);
                showToast('Gagal memutar', 'error');
            });
            return;
        }
    }

    if (currentCardPlaying) {
        currentCardPlaying.removeClass('ring-2 ring-primary');
        currentCardPlaying.find('.playing-badge').addClass('hidden');
        currentCardPlaying = null;
    }

    currentPlayContext = context;
    audio.src = track.preview;
    currentTrackId = track.id;

    audio.play()
        .then(() => {
            isPlaying = true;
            updatePlayPauseIcon();
            updatePlayerUI(track);

            if (context === 'search') {
                currentIndex = resultsCache.findIndex(t => t.id === track.id);
                currentCardPlaying = $('.card-hover').eq(currentIndex);
            } else if (context === 'favorites') {
                currentCardPlaying = $(`.card-hover:contains("${track.title}")`).first();
            }

            if (currentCardPlaying) {
                currentCardPlaying.addClass('ring-2 ring-primary');
                currentCardPlaying.find('.playing-badge').removeClass('hidden');

                if (window.innerWidth <= 640) {
                    try {
                        currentCardPlaying[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } catch (e) { /* ignore */ }
                }
            }

            updateCardPlayButtons();

            showToast(`Memutar: ${track.title} - ${fmtArtists(track)}`);
        })
        .catch(e => {
            console.error('Gagal memutar:', e);
            showToast('Gagal memutar preview', 'error');
        });
}

function updatePlayPauseIcon() {
    const icon = isPlaying ? 'fa-pause' : 'fa-play';
    $('#playPauseBtn').html(`<i class="fas ${icon} text-sm sm:text-base"></i>`);
}

audio.addEventListener('timeupdate', () => {
    if (!audio.duration || isNaN(audio.duration)) return;

    const progress = (audio.currentTime / audio.duration) * 100;
    $('#progressBar').css('width', progress + '%');
    $('#currentTime').text(formatDuration(audio.currentTime));
});

audio.addEventListener('loadedmetadata', () => {
    if (!audio.duration || isNaN(audio.duration)) return;
    $('#totalTime').text(formatDuration(audio.duration));
});

audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseIcon();
    if (currentCardPlaying) currentCardPlaying.find('.playing-badge').removeClass('hidden');
    updateCardPlayButtons();
});

audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseIcon();
    if (currentCardPlaying) currentCardPlaying.find('.playing-badge').addClass('hidden');
    updateCardPlayButtons();
});

audio.addEventListener('ended', () => {
    isPlaying = false;
    updatePlayPauseIcon();
    if (currentCardPlaying) currentCardPlaying.find('.playing-badge').addClass('hidden');
    showToast('Pemutaran selesai');
    currentTrackId = null;
    updateCardPlayButtons();

    if (currentPlayContext === 'search' && resultsCache.length > 0) {
        const next = (currentIndex + 1) % resultsCache.length;
        setTimeout(() => playTrack(resultsCache[next], 'search'), 500);
    }
});

// ------------------ Event Handlers ------------------
$('#searchBtn').click(() => {
    const query = $('#searchInput').val().trim();
    if (query) {
        performSearch(query, true);
    } else {
        $loadMore.addClass('hidden');
    }
});

$('#searchInput').on('keypress', (e) => {
    if (e.which === 13) {
        const query = $('#searchInput').val().trim();
        if (query) {
            performSearch(query, true);
        } else {
            $loadMore.addClass('hidden');
        }
    }
});

$('#searchInput').on('input', function () {
    const query = $(this).val().trim();
    if (!query) {
        $historyContainer.show();
        $emptyState.hide();
        $chartBanner.removeClass('hidden');
        $loadMore.addClass('hidden');
        $info.html('<i class="fas fa-info-circle mr-2 text-primary"></i>Mulai mengetik lalu tekan Cari');
        return;
    }

    $historyContainer.hide();
    $chartBanner.addClass('hidden');
    $info.html('<i class="fas fa-info-circle mr-2 text-primary"></i>Tekan tombol Cari untuk mencari');
});

$('#loadMoreBtn').click(() => performSearch(currentQuery, false));

$('#tabSearch').click(() => {
    $historyContainer.show();
    $('#searchSection, #resultsGrid, #resultsContainer, #chartBanner').show();
    $('#favSection').hide();
    $('.tab-btn').removeClass('bg-primary text-white').addClass('bg-slate-700 text-slate-300');
    $('#tabSearch').removeClass('bg-slate-700').addClass('bg-primary text-white');
    $info.show();
    $loadMore.addClass('hidden');
});

$('#tabFav').click(() => {
    $historyContainer.hide();
    $('#searchSection, #resultsGrid, #resultsContainer, #chartBanner').hide();
    $('#favSection').show();
    $('.tab-btn').removeClass('bg-primary text-white').addClass('bg-slate-700 text-slate-300');
    $('#tabFav').removeClass('bg-slate-700').addClass('bg-rose-500 text-white');
    $info.hide();
    $loadMore.addClass('hidden');
    renderFav();
});

$('#playPauseBtn').click(() => {
    if (!audio.src) {
        if (resultsCache.length) playTrack(resultsCache[0], 'search');
        return;
    }

    if (audio.paused) {
        audio.play().then(() => {
            isPlaying = true;
            updatePlayPauseIcon();
            showToast('Diteruskan');
        }).catch(e => {
            console.error('Gagal play:', e);
            showToast('Gagal memutar', 'error');
        });
    } else {
        audio.pause();
        isPlaying = false;
        updatePlayPauseIcon();
        showToast('Dijeda');
    }
});

$('#nextBtn').click(() => {
    if (resultsCache.length === 0) return;
    const next = (currentIndex + 1) % resultsCache.length;
    playTrack(resultsCache[next], 'search');
});

$('#prevBtn').click(() => {
    if (resultsCache.length === 0) return;
    const prev = (currentIndex - 1 + resultsCache.length) % resultsCache.length;
    playTrack(resultsCache[prev], 'search');
});

$('#closePlayer').click(() => {
    audio.pause();
    isPlaying = false;
    updatePlayPauseIcon();
    $('#playerCard').addClass('hidden');
    if (currentCardPlaying) {
        currentCardPlaying.removeClass('ring-2 ring-primary');
        currentCardPlaying.find('.playing-badge').addClass('hidden');
        currentCardPlaying = null;
    }
    currentTrackId = null;
    updateCardPlayButtons();
    showToast('Pemutar ditutup');
});

$('#progressContainer').on('click', function (e) {
    if (!audio.duration || isNaN(audio.duration)) return;
    const rect = this.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    audio.currentTime = pct * audio.duration;
});

$('#clearHistoryBtn').click(() => $('#confirmModal').removeClass('hidden'));
$('#cancelClear').click(() => $('#confirmModal').addClass('hidden'));
$('#confirmClear').click(() => {
    histories = [];
    localStorage.setItem('histories', '[]');
    renderHistory();
    $('#confirmModal').addClass('hidden');
    showToast('Semua riwayat dihapus');
});

// ------------------ Initialization ------------------
$(document).ready(() => {
    renderHistory();
    renderFav();
    $('#tabSearch').click();
    loadTopChart();

    $loadMore.addClass('hidden');
});
