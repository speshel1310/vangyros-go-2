class Game {
    constructor() {
        this.score = 0;
        this.timeLeft = 60; // 60 seconds game time
        this.lives = 3; // Starting with 3 lives
        this.isJumping = false;
        this.currentLane = 1; // 0: left, 1: center, 2: right
        this.obstacles = [];
        this.coins = [];
        this.gameInterval = null;
        this.timerInterval = null;
        this.isGameOver = false;
        this.isMuted = true; // Start with sound muted
        this.playerName = '';
        this.playerPhone = '';
        this.bestScore = 0;
        this.playerResults = [];
        this.allResults = [];
        this.pendingScore = null; // Для хранения результата игры до авторизации

        // Initialize Supabase client
        this.initializeSupabase();

        // Initialize audio
        this.initializeAudio();
        
        // Define obstacle types
        this.obstacleTypes = [
            { emoji: '🪨', name: 'камень' },
            { emoji: '🚗', name: 'машина' },
            { emoji: '🚌', name: 'автобус' }
        ];

        // Save lane positions
        this.lanePositions = [16.66, 50, 83.33];

        // Initialize game elements
        this.initializeElements();
        
        // Auth form handling
        this.setupAuthForm();
        
        // Leaderboard handling
        this.setupLeaderboard();
    }

    initializeSupabase() {
        try {
            // Replace with your Supabase URL and anon key
            const supabaseUrl = 'https://otyhkskvkqmvzkvrtfpy.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eWhrc2t2a3FtdnprdnJ0ZnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2MDA4MzksImV4cCI6MjA2MTE3NjgzOX0.74tnApnQiDpRCElSgGDP54lMnKB-dp4n6dtp1CL6Yi4';
            this.supabase = supabase.createClient(supabaseUrl, supabaseKey);
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            // Fallback to localStorage if Supabase initialization fails
            this.supabase = null;
        }
    }

    initializeAudio() {
        try {
            this.audio = {
                background: new Audio('audio/background.mp3')
                // Удаляем все звуки кроме фонового
            };

            // Configure background music
            if (this.audio.background) {
                this.audio.background.loop = true;
                this.audio.background.volume = 0; // Start with volume 0
            }
        } catch (error) {
            console.error('Error initializing audio:', error);
        }
    }

    initializeElements() {
        // Find main game elements
        this.player = document.getElementById('player');
        this.gameArea = document.querySelector('.game-area');
        this.scoreElement = document.getElementById('score');
        this.timerElement = document.getElementById('timer');
        this.gameOverScreen = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.resultMessageElement = document.querySelector('.result-message');
        this.bestScoreElement = document.getElementById('best-score');
        this.gameContainer = document.getElementById('game-container');
        this.authScreen = document.getElementById('auth-screen');
        this.livesElement = document.getElementById('lives');
        this.livesCountElement = this.livesElement ? this.livesElement.querySelector('.lives-count') : null;

        // Check if elements are found
        if (!this.player) console.error("Player element not found!");
        if (!this.gameArea) console.error("Game area element not found!");
        if (!this.scoreElement) console.error("Score element not found!");
        if (!this.timerElement) console.error("Timer element not found!");
        if (!this.gameOverScreen) console.error("Game Over screen not found!");

        // Hide screens at the beginning
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');

        // Add sound button to game area
        this.initializeSoundButton();
        
        // Create lives display if it doesn't exist
        this.createLivesDisplay();
        
        // Create leaderboard button outside game area
        this.createLeaderboardButton();

        // Set event listeners
        this.setupEventListeners();
        
        // Set initial player position
        this.updatePlayerPosition();
    }

    initializeSoundButton() {
        try {
            const soundButton = document.createElement('button');
            soundButton.id = 'sound-toggle';
            soundButton.innerHTML = '🔇'; // Start with mute icon
            soundButton.className = 'sound-button';

            // Find the controls-right container
            const controlsRight = document.querySelector('.controls-right');
            if (controlsRight) {
                controlsRight.appendChild(soundButton);
                soundButton.addEventListener('click', () => {
                    this.toggleSound();
                    soundButton.innerHTML = this.isMuted ? '🔇' : '🔊';
                });
            }
        } catch (error) {
            console.error('Error initializing sound button:', error);
        }
    }

    setupAuthForm() {
        const authForm = document.getElementById('auth-form');
        const playerPhoneInput = document.getElementById('player-phone');
        
        // Добавляем маску и форматирование для телефона
        if (playerPhoneInput) {
            // Устанавливаем начальное значение
            if (!playerPhoneInput.value) {
                playerPhoneInput.value = '+7';
            }
            
            // Обработчик для ввода только цифр и сохранения +7 в начале
            playerPhoneInput.addEventListener('input', (e) => {
                let value = e.target.value;
                
                // Удаляем все нецифровые символы кроме +
                const cleanedValue = value.replace(/[^\d+]/g, '');
                
                // Если пользователь стирает всё, оставляем +7
                if (cleanedValue.length <= 1) {
                    e.target.value = '+7';
                    return;
                }
                
                // Убеждаемся, что начинается с +7
                if (!cleanedValue.startsWith('+')) {
                    if (cleanedValue.startsWith('7')) {
                        e.target.value = '+' + cleanedValue;
                    } else if (cleanedValue.startsWith('8')) {
                        e.target.value = '+7' + cleanedValue.substring(1);
                    } else {
                        e.target.value = '+7' + cleanedValue;
                    }
                } else if (!cleanedValue.startsWith('+7')) {
                    e.target.value = '+7' + cleanedValue.substring(1);
                } else {
                    e.target.value = cleanedValue;
                }
                
                // Ограничиваем длину (включая +7) до 12 символов: +7 и 10 цифр
                if (e.target.value.length > 12) {
                    e.target.value = e.target.value.substring(0, 12);
                }
            });
            
            // Предотвращаем удаление +7 при backspace или delete
            playerPhoneInput.addEventListener('keydown', (e) => {
                const value = e.target.value;
                
                if (
                    (e.key === 'Backspace' || e.key === 'Delete') && 
                    (value.length <= 2 || 
                     (e.target.selectionStart <= 2 && e.target.selectionEnd <= 2))
                ) {
                    e.preventDefault();
                }
            });
        }
        
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const phoneInputGroup = playerPhoneInput.closest('.form-group');
                const isPhoneVisible = phoneInputGroup && !phoneInputGroup.classList.contains('form-group-hidden');
                
                if (!isPhoneVisible) {
                    this.authScreen.classList.add('hidden');
                    this.gameContainer.classList.remove('hidden');
                    this.startGame();
                    return;
                }
                
                this.playerName = "Player";
                let phoneNumber = playerPhoneInput.value.trim();
                
                // Убираем все нецифровые символы (кроме +)
                phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
                
                // Добавляем + в начало, если его нет
                if (!phoneNumber.startsWith('+')) {
                    // Если начинается с 8, заменяем на +7
                    if (phoneNumber.startsWith('8')) {
                        phoneNumber = '+7' + phoneNumber.substring(1);
                    } else if (phoneNumber.startsWith('7')) {
                        // Если начинается с 7, добавляем +
                        phoneNumber = '+' + phoneNumber;
                    } else {
                        // Если ничего из вышеперечисленного, предполагаем 7
                        phoneNumber = '+7' + phoneNumber;
                    }
                }
                
                this.playerPhone = phoneNumber;
                this.loadPlayerResults();
                
                if (this.pendingScore !== null) {
                    console.log(`Сохраняем отложенный результат: ${this.pendingScore}`);
                    const pendingScoreValue = this.pendingScore;
                    const currentScore = this.score;
                    this.score = pendingScoreValue;
                    this.saveResult();
                    this.pendingScore = null;
                    this.score = 0;
                }
                
                // Скрываем поле телефона и делаем его необязательным для следующей игры
                if (playerPhoneInput) {
                    playerPhoneInput.required = false;
                    playerPhoneInput.hidden = true;
                    playerPhoneInput.disabled = true;
                    if (phoneInputGroup) {
                        phoneInputGroup.classList.add('form-group-hidden');
                    }
                }
                const startButton = document.getElementById('start-game-btn');
                if (startButton) {
                     startButton.textContent = 'Начать игру'; // Возвращаем текст кнопки
                }

                this.authScreen.classList.add('hidden');
                this.gameContainer.classList.remove('hidden');
                this.startGame();
            });
        }
    }

    setupLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        const closeLeaderboardBtn = document.getElementById('close-leaderboard');
        
        if (closeLeaderboardBtn && leaderboard) {
            closeLeaderboardBtn.addEventListener('click', () => {
                leaderboard.classList.add('hidden');
            });
        }
    }

    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        // Clear current leaderboard
        leaderboardList.innerHTML = '';
        
        // Show loading message
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'leaderboard-loading';
        loadingMessage.textContent = 'Загрузка результатов...';
        leaderboardList.appendChild(loadingMessage);
        
        if (this.supabase) {
            // Fetch top 3 players directly from Supabase
            this.supabase
                .from('game_results')
                .select('*')
                .order('score', { ascending: false })
                .limit(10)
                .then(({ data, error }) => {
                    // Remove loading message
                    leaderboardList.innerHTML = '';
                    
                    if (error) {
                        console.error('Error loading leaderboard from Supabase:', error);
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'leaderboard-error';
                        errorMessage.textContent = 'Ошибка загрузки результатов';
                        leaderboardList.appendChild(errorMessage);
                        return;
                    }
                    
                    if (!data || data.length === 0) {
                        const noDataMessage = document.createElement('div');
                        noDataMessage.className = 'leaderboard-no-data';
                        noDataMessage.textContent = 'Пока нет результатов';
                        leaderboardList.appendChild(noDataMessage);
                        return;
                    }
                    
                    // Get unique players with their best scores
                    const playersMap = new Map();
                    
                    data.forEach(result => {
                        const key = `${result.name}-${result.phone}`;
                        if (!playersMap.has(key) || playersMap.get(key).score < result.score) {
                            playersMap.set(key, {
                                name: result.name,
                                phone: result.phone,
                                score: result.score
                            });
                        }
                    });
                    
                    // Convert to array and sort
                    const uniquePlayers = Array.from(playersMap.values());
                    uniquePlayers.sort((a, b) => b.score - a.score);
                    
                    // Get top 3 players
                    const topPlayers = uniquePlayers.slice(0, 3);
                    
                    // Position labels
                    const positions = ['1е место', '2е место', '3е место'];
                    
                    // Add players to leaderboard
                    topPlayers.forEach((player, index) => {
                        const item = document.createElement('div');
                        item.className = 'leaderboard-item';
                        
                        const rank = document.createElement('div');
                        rank.className = 'leaderboard-rank';
                        rank.textContent = positions[index];
                        
                        const phone = document.createElement('div');
                        phone.className = 'leaderboard-name';
                        // Маскирование номера телефона для приватности
                        const maskedPhone = player.phone.substring(0, 4) + '***' + player.phone.substring(player.phone.length - 2);
                        phone.textContent = maskedPhone;
                        
                        const score = document.createElement('div');
                        score.className = 'leaderboard-score';
                        score.textContent = player.score;
                        
                        item.appendChild(rank);
                        item.appendChild(phone);
                        item.appendChild(score);
                        
                        leaderboardList.appendChild(item);
                    });
                    
                    // If there are less than 3 players, add empty slots
                    for (let i = topPlayers.length; i < 3; i++) {
                        const item = document.createElement('div');
                        item.className = 'leaderboard-item empty-slot';
                        
                        const rank = document.createElement('div');
                        rank.className = 'leaderboard-rank';
                        rank.textContent = positions[i];
                        
                        const emptyName = document.createElement('div');
                        emptyName.className = 'leaderboard-name';
                        emptyName.textContent = '—';
                        
                        const emptyScore = document.createElement('div');
                        emptyScore.className = 'leaderboard-score';
                        emptyScore.textContent = '—';
                        
                        item.appendChild(rank);
                        item.appendChild(emptyName);
                        item.appendChild(emptyScore);
                        
                        leaderboardList.appendChild(item);
                    }
                });
        } else {
            // Fallback to localStorage if Supabase is not available
            this.loadAllResults();
            
            // Remove loading message
            leaderboardList.innerHTML = '';
            
            // Get top 3 unique players
            const topPlayers = this.getTopPlayers(3);
            
            // Position labels
            const positions = ['1е место', '2е место', '3е место'];
            
            // Add players to leaderboard
            topPlayers.forEach((player, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                
                const rank = document.createElement('div');
                rank.className = 'leaderboard-rank';
                rank.textContent = positions[index];
                
                const phone = document.createElement('div');
                phone.className = 'leaderboard-name';
                // Маскирование номера телефона для приватности
                const maskedPhone = player.phone.substring(0, 4) + '***' + player.phone.substring(player.phone.length - 2);
                phone.textContent = maskedPhone;
                
                const score = document.createElement('div');
                score.className = 'leaderboard-score';
                score.textContent = player.score;
                
                item.appendChild(rank);
                item.appendChild(phone);
                item.appendChild(score);
                
                leaderboardList.appendChild(item);
            });
            
            // If there are less than 3 players, add empty slots
            for (let i = topPlayers.length; i < 3; i++) {
                const item = document.createElement('div');
                item.className = 'leaderboard-item empty-slot';
                
                const rank = document.createElement('div');
                rank.className = 'leaderboard-rank';
                rank.textContent = positions[i];
                
                const emptyName = document.createElement('div');
                emptyName.className = 'leaderboard-name';
                emptyName.textContent = '—';
                
                const emptyScore = document.createElement('div');
                emptyScore.className = 'leaderboard-score';
                emptyScore.textContent = '—';
                
                item.appendChild(rank);
                item.appendChild(emptyName);
                item.appendChild(emptyScore);
                
                leaderboardList.appendChild(item);
            }
        }
    }

    getTopPlayers(count) {
        // Get unique players with their best scores
        const playersMap = new Map();
        
        this.allResults.forEach(result => {
            const key = `${result.name}-${result.phone}`;
            if (!playersMap.has(key) || playersMap.get(key).score < result.score) {
                playersMap.set(key, {
                    name: result.name,
                    phone: result.phone,
                    score: result.score
                });
            }
        });
        
        // Convert to array and sort
        const uniquePlayers = Array.from(playersMap.values());
        uniquePlayers.sort((a, b) => b.score - a.score);
        
        // Return top N players
        return uniquePlayers.slice(0, count);
    }

    loadPlayerResults() {
        if (this.supabase) {
            // First try to load from Supabase
            this.supabase
                .from('game_results')
                .select('*')
                .eq('phone', this.playerPhone)
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading player results from Supabase:', error);
                        // Fallback to localStorage
                        this.loadPlayerResultsFromLocalStorage();
                    } else if (data) {
                        this.playerResults = data;
                        
                        // Find best score
                        this.bestScore = 0;
                        this.playerResults.forEach(result => {
                            if (result.score > this.bestScore) {
                                this.bestScore = result.score;
                            }
                        });
                        
                        // Update best score display
                        if (this.bestScoreElement) {
                            this.bestScoreElement.textContent = this.bestScore;
                        }
                    }
                });
        } else {
            // Fallback to localStorage
            this.loadPlayerResultsFromLocalStorage();
        }
    }
    
    loadPlayerResultsFromLocalStorage() {
        try {
            const storedResults = localStorage.getItem('gameResults');
            if (storedResults) {
                this.allResults = JSON.parse(storedResults);
                
                // Filter current player's results
                this.playerResults = this.allResults.filter(result => 
                    result.name === this.playerName && 
                    result.phone === this.playerPhone
                );
                
                // Get player's best score
                if (this.playerResults.length > 0) {
                    this.bestScore = Math.max(...this.playerResults.map(r => r.score));
                }
            }
        } catch (error) {
            console.error('Error loading player results from localStorage:', error);
            this.playerResults = [];
            this.bestScore = 0;
        }
    }

    loadAllResults() {
        if (this.supabase) {
            // Try loading from Supabase
            this.supabase
                .from('game_results')
                .select('*')
                .order('score', { ascending: false })
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error loading all results from Supabase:', error);
                        // Fallback to localStorage
                        this.loadFromLocalStorage();
                    } else if (data) {
                        this.allResults = data;
                    }
                });
        } else {
            // Fallback to localStorage
            this.loadFromLocalStorage();
        }
    }
    
    loadFromLocalStorage() {
        try {
            const storedResults = localStorage.getItem('gameResults');
            if (storedResults) {
                this.allResults = JSON.parse(storedResults);
            } else {
                this.allResults = [];
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.allResults = [];
        }
    }

    saveResult() {
        // Проверяем, что пользователь авторизован
        if (!this.playerPhone || this.playerPhone.length < 10) {
            console.warn('Cannot save result: player is not authenticated');
            return;
        }
        
        console.log(`Сохраняем результат ${this.score} для игрока с телефоном ${this.playerPhone}`);
        
        // Create result object
        const result = {
            name: this.playerName,
            phone: this.playerPhone,
            score: this.score,
            date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        };
        
        // Update player results
        this.playerResults.push(result);
        
        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            if (this.bestScoreElement) {
                this.bestScoreElement.textContent = this.bestScore;
            }
        }
        
        // Update message
        if (this.resultMessageElement) {
            if (this.score > this.bestScore && this.playerResults.length > 1) {
                this.resultMessageElement.textContent = 'Новый рекорд!';
            } else if (this.playerResults.length > 1) {
                this.resultMessageElement.textContent = 
                    `Ваш лучший результат: ${this.bestScore}. Попробуй ещё!`;
            }
        }
        
        // Безопасная проверка результата перед сохранением
        // Не позволяем сохранять нереалистичные значения
        if (this.score < 0 || this.score > 1000) {
            console.error('Invalid score value detected');
            // Fallback to localStorage
            this.saveToLocalStorage(result);
            return;
        }
        
        // Save to Supabase
        if (this.supabase) {
            console.log(`Отправляем в Supabase результат: ${this.score} очков для номера ${this.playerPhone}`);
            this.supabase
                .from('game_results')
                .insert([{
                    name: this.playerName,
                    phone: this.playerPhone,
                    score: this.score,
                    date: new Date().toISOString().split('T')[0]
                }])
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error saving result to Supabase:', error);
                        // Fallback to localStorage
                        this.saveToLocalStorage(result);
                    } else {
                        console.log('Result saved to Supabase successfully', data);
                    }
                });
        } else {
            // Fallback to localStorage
            this.saveToLocalStorage(result);
        }
    }

    saveToLocalStorage(result) {
        try {
            // Load existing results
            let results = [];
            const storedResults = localStorage.getItem('gameResults');
            if (storedResults) {
                results = JSON.parse(storedResults);
            }
            
            // Add new result
            results.push(result);
            
            // Save back to localStorage
            localStorage.setItem('gameResults', JSON.stringify(results));
            console.log('Result saved to localStorage');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    clearGame() {
        // Hide screens
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');

        // Remove existing obstacles and coins from DOM
        const existingObstacles = document.querySelectorAll('.obstacle');
        const existingCoins = document.querySelectorAll('.coin');
        existingObstacles.forEach(obstacle => obstacle.remove());
        existingCoins.forEach(coin => coin.remove());

        // Clear arrays
        this.obstacles = [];
        this.coins = [];
        this.isGameOver = false;
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Touch controls (only left/right swipes)
        let touchStartX = 0;
        let touchStartY = 0;

        if (this.gameArea) {
            this.gameArea.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                e.preventDefault();
            }, { passive: false });

            this.gameArea.addEventListener('touchmove', (e) => {
                if (this.isGameOver || e.touches.length === 0) return;

                const touchEndX = e.touches[0].clientX;
                const touchEndY = e.touches[0].clientY;
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;

                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    const swipeThreshold = 50;
                    if (deltaX > swipeThreshold) {
                        this.moveRight();
                        touchStartX = touchEndX;
                        touchStartY = touchEndY;
                    } else if (deltaX < -swipeThreshold) {
                        this.moveLeft();
                        touchStartX = touchEndX;
                        touchStartY = touchEndY;
                    }
                }
                e.preventDefault();
            }, { passive: false });
        }

        // Button controls (only left/right)
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');

        if (btnLeft) {
            btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); if (!this.isGameOver) this.moveLeft(); });
            btnLeft.addEventListener('click', () => { if (!this.isGameOver) this.moveLeft(); });
        }
        if (btnRight) {
            btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); if (!this.isGameOver) this.moveRight(); });
            btnRight.addEventListener('click', () => { if (!this.isGameOver) this.moveRight(); });
        }

        // Restart buttons
        const restartButtons = [
            document.getElementById('restart'),
            document.getElementById('play-again')
        ];

        restartButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    console.log('Restart button clicked');
                    this.restartGame();
                });
            }
        });
        
        // Leaderboard button from game over screen
        const showLeaderboardBtn = document.getElementById('show-leaderboard-from-gameover');
        if (showLeaderboardBtn) {
            showLeaderboardBtn.addEventListener('click', () => {
                this.updateLeaderboard();
                const leaderboard = document.getElementById('leaderboard');
                if (leaderboard) {
                    leaderboard.classList.remove('hidden');
                }
            });
        }
    }

    handleKeyPress(e) {
        if (this.isGameOver) return;
        switch (e.key) {
            case 'ArrowLeft': this.moveLeft(); break;
            case 'ArrowRight': this.moveRight(); break;
            // Add M for mute/unmute
            case 'm':
            case 'M':
            case 'ь': // Russian M
                this.toggleSound();
                // Update icon on button if it exists
                const soundButton = document.getElementById('sound-toggle');
                if (soundButton) {
                     soundButton.innerHTML = this.isMuted ? '🔇' : '🔊';
                }
                break;
        }
    }

    moveLeft() {
        if (this.currentLane > 0) {
            this.currentLane--;
            this.updatePlayerPosition();
        }
    }

    moveRight() {
        if (this.currentLane < this.lanePositions.length - 1) {
            this.currentLane++;
            this.updatePlayerPosition();
        }
    }

    updatePlayerPosition() {
        if (this.player) {
            this.player.style.left = `${this.lanePositions[this.currentLane]}%`;
        }
    }

    createObstacle() {
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        const randomType = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
        obstacle.innerHTML = randomType.emoji;
        obstacle.title = randomType.name;
        const lane = Math.floor(Math.random() * this.lanePositions.length);
        obstacle.style.left = `${this.lanePositions[lane]}%`;
        obstacle.style.top = '0';
        if (this.gameArea) {
            this.gameArea.appendChild(obstacle);
            this.obstacles.push({ element: obstacle, lane: lane, type: randomType.name });
        }
    }

    createCoin() {
        const coin = document.createElement('div');
        coin.className = 'coin';
        coin.innerHTML = '🥙';
        const lane = Math.floor(Math.random() * this.lanePositions.length);
        coin.style.left = `${this.lanePositions[lane]}%`;
        coin.style.top = '0';
        if (this.gameArea) {
            this.gameArea.appendChild(coin);
            this.coins.push({ element: coin, lane: lane });
        }
    }

    moveObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            const currentTop = parseInt(obstacle.element.style.top || '0');
            const newTop = currentTop + 4;
            obstacle.element.style.top = `${newTop}px`;
            const removalThreshold = this.gameArea ? this.gameArea.offsetHeight : 400;
            if (newTop > removalThreshold) {
                obstacle.element.remove();
                this.obstacles.splice(i, 1);
            } else if (this.checkCollision(obstacle)) {
                this.handleCollision(obstacle, i);
            }
        }
    }

    moveCoins() {
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            const currentTop = parseInt(coin.element.style.top || '0');
            const newTop = currentTop + 3;
            coin.element.style.top = `${newTop}px`;
            const removalThreshold = this.gameArea ? this.gameArea.offsetHeight : 400;
            if (newTop > removalThreshold) {
                coin.element.remove();
                this.coins.splice(i, 1);
            } else if (this.checkCoinCollision(coin)) {
                this.handleCoinCollection(coin, i);
            }
        }
    }

    checkCollision(obstacle) {
        if (!this.player) return false;
        const playerRect = this.player.getBoundingClientRect();
        const obstacleRect = obstacle.element.getBoundingClientRect();
        return obstacle.lane === this.currentLane &&
               obstacleRect.bottom > playerRect.top &&
               obstacleRect.top < playerRect.bottom;
    }

    checkCoinCollision(coin) {
        if (!this.player) return false;
        const playerRect = this.player.getBoundingClientRect();
        const coinRect = coin.element.getBoundingClientRect();
        return coin.lane === this.currentLane &&
               coinRect.bottom > playerRect.top &&
               coinRect.top < playerRect.bottom;
    }

    handleCollision(obstacle, index) {
        this.lives--;
        this.updateLivesDisplay();
        
        // Show collision message
        if (this.gameArea) {
            const message = document.createElement('div');
            message.className = 'collision-message';
            message.style.position = 'absolute';
            message.style.left = obstacle.element.style.left;
            message.style.top = obstacle.element.style.top;
            message.textContent = `Ай! ${obstacle.type}!`;
            this.gameArea.appendChild(message);
            setTimeout(() => message.remove(), 1000);
        }

        obstacle.element.remove();
        this.obstacles.splice(index, 1);
        
        // End game if no lives left
        if (this.lives <= 0) {
            this.endGame();
        }
    }

    handleCoinCollection(coin, index) {
        this.score += 10;
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score;
        }
        
        // Удаляем воспроизведение звука монеты
        
        coin.element.remove();
        this.coins.splice(index, 1);
    }

    updateTimer() {
        this.timeLeft--;
        if (this.timerElement) {
            this.timerElement.textContent = this.timeLeft;
        }
        
        if (this.timeLeft <= 0) {
            this.endGame();
        }
    }

    endGame() {
        this.isGameOver = true;
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        this.stopSound();

        if (this.finalScoreElement) this.finalScoreElement.textContent = this.score;

        let authToSaveButton = document.getElementById('auth-to-save');
        const gameOverContent = document.querySelector('.game-over-content');

        if (!this.playerPhone || this.playerPhone.length < 10) { // Игрок НЕ авторизован
            this.pendingScore = this.score; 

            if (!authToSaveButton && gameOverContent) {
                authToSaveButton = document.createElement('button');
                authToSaveButton.id = 'auth-to-save';
                authToSaveButton.className = 'game-btn';
                const showLeaderboardBtn = document.getElementById('show-leaderboard-from-gameover');
                if (showLeaderboardBtn && showLeaderboardBtn.parentNode === gameOverContent) {
                    showLeaderboardBtn.insertAdjacentElement('afterend', authToSaveButton);
                } else {
                    gameOverContent.appendChild(authToSaveButton); 
                }
            }

            if (authToSaveButton) {
                authToSaveButton.textContent = 'Сохранить результат';
                authToSaveButton.style.display = 'block'; 

                const newButton = authToSaveButton.cloneNode(true);
                authToSaveButton.parentNode.replaceChild(newButton, authToSaveButton);
                authToSaveButton = newButton;

                authToSaveButton.addEventListener('click', () => {
                    if(this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
                    if(this.authScreen) this.authScreen.classList.remove('hidden');
                    
                    const phoneInput = document.getElementById('player-phone');
                    if (phoneInput) {
                        phoneInput.required = true;
                        phoneInput.hidden = false;
                        phoneInput.disabled = false;
                        const formGroup = phoneInput.closest('.form-group');
                        if (formGroup) formGroup.classList.remove('form-group-hidden');
                    }
                    
                    const startGameBtnOnAuth = document.getElementById('start-game-btn');
                    if (startGameBtnOnAuth) startGameBtnOnAuth.textContent = 'Сохранить и продолжить';
                    
                    const authContent = document.querySelector('.auth-content');
                    if (authContent) {
                        let msgElement = document.getElementById('pending-score-message');
                        if (!msgElement) { 
                            msgElement = document.createElement('div');
                            msgElement.id = 'pending-score-message';
                            const heading = authContent.querySelector('h2');
                            if (heading && heading.nextSibling) {
                                authContent.insertBefore(msgElement, heading.nextSibling);
                            } else {
                                authContent.insertBefore(msgElement, authContent.firstChild);
                            }
                        }
                        msgElement.style.color = '#ffd600';
                        msgElement.style.marginBottom = '15px';
                        msgElement.innerHTML = `<strong>Вы набрали: ${this.pendingScore} очков!</strong><br>Введите номер телефона, чтобы сохранить результат.`;
                    }
                });
            }

            if (this.resultMessageElement) this.resultMessageElement.textContent = "Чтобы результат попал в таблицу, сохраните его.";
            if (this.bestScoreElement) this.bestScoreElement.textContent = "-";

        } else { // Игрок АВТОРИЗОВАН
            if (authToSaveButton) {
                authToSaveButton.style.display = 'none'; 
            }
            this.saveResult(); 
            if (this.bestScoreElement) this.bestScoreElement.textContent = this.bestScore;
        }

        if (this.gameOverScreen) this.gameOverScreen.classList.remove('hidden');
    }

    startGame() {
        // Reset game state
        this.score = 0;
        this.timeLeft = 60;
        this.lives = 3; // Reset lives to 3
        this.isGameOver = false;
        
        // Update UI
        if (this.scoreElement) {
            this.scoreElement.textContent = '0';
        }
        if (this.timerElement) {
            this.timerElement.textContent = '60';
        }
        this.updateLivesDisplay();
        
        // Start playing background music
        this.playSound();

        // Game speed and probabilities
        const gameSpeed = 30;
        const obstacleProbability = 0.02;
        const coinProbability = 0.03;

        // Start game loop
        this.gameInterval = setInterval(() => {
            if (this.isGameOver) return;
            if (Math.random() < obstacleProbability) this.createObstacle();
            if (Math.random() < coinProbability) this.createCoin();
            this.moveObstacles();
            this.moveCoins();
        }, gameSpeed);
        
        // Start timer
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    restartGame() {
        try {
            console.log('Restarting game...');
            
            // Clear intervals
            if (this.gameInterval) {
                clearInterval(this.gameInterval);
            }
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            // Clear game field
            this.clearGame();

            // Hide Game Over screen
            if (this.gameOverScreen) {
                this.gameOverScreen.classList.add('hidden');
            }

            // Update player position
            this.updatePlayerPosition();

            // Reset audio
            this.stopSound();
            if (this.audio.background) {
                this.audio.background.currentTime = 0;
            }

            // Start the game again
            this.startGame();
        } catch (error) {
            console.error('Error in restartGame:', error);
        }
    }

    toggleSound() {
        try {
            this.isMuted = !this.isMuted;
            
            if (this.isMuted) {
                // Mute background music
                if (this.audio.background) {
                    this.audio.background.volume = 0;
                    this.audio.background.pause();
                }
            } else {
                // Unmute background music
                if (this.audio.background) {
                    this.audio.background.volume = 0.3;
                    this.audio.background.play().catch(e => console.warn('Error playing background sound:', e));
                }
            }
        } catch (error) {
            console.error('Error toggling sound:', error);
        }
    }

    // Play background music only
    playSound() {
        if (!this.isMuted && this.audio.background && this.audio.background.paused) {
            this.audio.background.play().catch(e => console.warn(`Error playing background sound:`, e));
        }
    }

    // Stop background music only
    stopSound() {
         if (this.audio.background) {
            this.audio.background.pause();
         }
    }

    createLivesDisplay() {
        if (!this.livesElement) {
            // Create lives display container if it doesn't exist
            this.livesElement = document.createElement('div');
            this.livesElement.id = 'lives';
            this.livesElement.className = 'lives-display';
            
            const livesLabel = document.createElement('span');
            livesLabel.textContent = 'Жизни: ';
            this.livesElement.appendChild(livesLabel);
            
            this.livesCountElement = document.createElement('span');
            this.livesCountElement.className = 'lives-count';
            this.livesElement.appendChild(this.livesCountElement);
            
            // Add it near the score/timer
            const gameInfo = document.querySelector('.game-info');
            if (gameInfo) {
                gameInfo.appendChild(this.livesElement);
            } else if (this.gameArea) {
                this.gameArea.parentNode.insertBefore(this.livesElement, this.gameArea);
            }
        } else {
            // Если элемент уже существует, найдем внутри него счетчик
            this.livesCountElement = this.livesElement.querySelector('.lives-count');
            if (!this.livesCountElement) {
                // Если почему-то счетчик не найден, создадим его
                this.livesCountElement = document.createElement('span');
                this.livesCountElement.className = 'lives-count';
                this.livesElement.appendChild(this.livesCountElement);
            }
        }
        
        this.updateLivesDisplay();
    }
    
    updateLivesDisplay() {
        // Ищем счетчик жизней, если он еще не инициализирован
        if (!this.livesCountElement) {
            this.livesCountElement = document.querySelector('.lives-count');
        }
        
        if (this.livesCountElement) {
            // Отображаем жизни в виде сердечек
            let heartsHTML = '';
            for (let i = 0; i < this.lives; i++) {
                heartsHTML += '❤️';
            }
            for (let i = this.lives; i < 3; i++) {
                heartsHTML += '🖤';
            }
            this.livesCountElement.innerHTML = heartsHTML;
        } else {
            console.error('Не удалось найти элемент для отображения жизней');
        }
    }
    
    createLeaderboardButton() {
        // Check if the trophy button already exists
        let leaderboardBtn = document.getElementById('leaderboard-btn');
        
        // If it doesn't exist, create it
        if (!leaderboardBtn) {
            leaderboardBtn = document.createElement('button');
            leaderboardBtn.id = 'leaderboard-btn';
            leaderboardBtn.className = 'trophy-button';
            leaderboardBtn.innerHTML = '🏆';
            leaderboardBtn.title = 'Таблица рекордов';
            
            // Add the button to the controls-right container
            const controlsRight = document.querySelector('.controls-right');
            if (controlsRight) {
                controlsRight.appendChild(leaderboardBtn);
            }
        }
        
        // Add event listener (reattach it in case it was lost)
        leaderboardBtn.addEventListener('click', () => {
            this.updateLeaderboard();
            const leaderboard = document.getElementById('leaderboard');
            if (leaderboard) {
                leaderboard.classList.remove('hidden');
            }
        });
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    const game = new Game();
    
    game.authScreen.classList.remove('hidden');
    game.gameContainer.classList.add('hidden');
    
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        const phoneInput = document.getElementById('player-phone');
        if (phoneInput) {
            phoneInput.required = false;
            phoneInput.hidden = true;     // Скрываем само поле
            phoneInput.disabled = true;   // Отключаем поле, чтобы оно не валидировалось
            const formGroup = phoneInput.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('form-group-hidden'); // Скрываем родительский блок
            }
        }
        
        const startButton = document.getElementById('start-game-btn');
        if (startButton) {
            startButton.textContent = 'Начать игру';
        }
    }
});
