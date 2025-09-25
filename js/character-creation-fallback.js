/**
 * Fallback Character Creation System
 *
 * This module provides a bulletproof character creation experience that works
 * independently of complex game modules using simple DOM events and polling-based
 * state detection.
 *
 * Key Features:
 * - No dependencies on event systems or game modules
 * - Simple onclick handlers for button interactions
 * - Polling-based state detection for button enabling
 * - Direct DOM manipulation for form interactions
 * - localStorage fallback for character data persistence
 * - Graceful transition to full game system when available
 */

(function() {
    'use strict';

    console.log('[CharacterCreation] Initializing fallback character creation system');

    // Character creation state
    const characterState = {
        origin: null,
        vow: null,
        mark: null
    };

    // Track if we've already set up
    let isSetup = false;

    /**
     * Initialize character creation system
     */
    function initializeCharacterCreation() {
        if (isSetup) {
            console.log('[CharacterCreation] Already initialized, skipping');
            return;
        }

        console.log('[CharacterCreation] Setting up character creation...');

        // Set up fragment choice buttons with simple onclick handlers
        setupFragmentChoices();

        // Set up begin cultivation button
        setupBeginButton();

        // Start polling for state changes
        startPolling();

        isSetup = true;
        console.log('[CharacterCreation] Setup complete');
    }

    /**
     * Set up fragment choice buttons with onclick handlers
     */
    function setupFragmentChoices() {
        const buttons = document.querySelectorAll('.fragment-choice');
        console.log(`[CharacterCreation] Setting up ${buttons.length} fragment choice buttons`);

        buttons.forEach(button => {
            // Use onclick attribute for maximum reliability
            button.onclick = function(e) {
                e.preventDefault();
                handleFragmentClick(this);
            };
        });
    }

    /**
     * Handle fragment button click
     */
    function handleFragmentClick(button) {
        const categoryContainer = button.closest('.fragment-choices');
        const category = categoryContainer?.dataset.category;
        const choice = button.dataset.choice;

        console.log(`[CharacterCreation] Fragment clicked - Category: ${category}, Choice: ${choice}`);

        if (!category || !choice) {
            console.warn('[CharacterCreation] Invalid button click - missing category or choice');
            return;
        }

        // Remove active/selected class from all buttons in same category
        if (categoryContainer) {
            categoryContainer.querySelectorAll('.fragment-choice').forEach(btn => {
                btn.classList.remove('active', 'selected');
            });
        }

        // Add active and selected class to clicked button
        button.classList.add('active', 'selected');

        // Update state directly
        characterState[category] = choice;
        console.log('[CharacterCreation] State updated:', characterState);

        // Force update the begin button immediately
        setTimeout(() => {
            updateBeginButton();
            // Double-check after a small delay
            setTimeout(updateBeginButton, 100);
        }, 10);
    }

    /**
     * Set up begin cultivation button
     */
    function setupBeginButton() {
        const beginBtn = document.getElementById('begin-cultivation');
        if (!beginBtn) {
            console.warn('[CharacterCreation] Begin cultivation button not found');
            return;
        }

        // Use onclick for maximum reliability
        beginBtn.onclick = function(e) {
            e.preventDefault();
            handleBeginCultivation();
        };

        console.log('[CharacterCreation] Begin button setup complete');
    }

    /**
     * Handle begin cultivation button click
     */
    function handleBeginCultivation() {
        // Verify all choices are made
        if (!characterState.origin || !characterState.vow || !characterState.mark) {
            console.warn('[CharacterCreation] Cannot begin - not all choices made');
            return;
        }

        console.log('[CharacterCreation] Character creation completed:', characterState);

        // Save to localStorage as fallback
        try {
            localStorage.setItem('characterChoices', JSON.stringify(characterState));
            localStorage.setItem('idleCultivation_hasCharacter', 'true');
            console.log('[CharacterCreation] Character data saved to localStorage');
        } catch (err) {
            console.error('[CharacterCreation] Failed to save to localStorage:', err);
        }

        // Initialize player data in gameState if available
        if (window.gameState && typeof window.gameState.set === 'function') {
            window.gameState.set('player.character', {
                created: true,
                origin: characterState.origin,
                vow: characterState.vow,
                mark: characterState.mark,
                name: characterState.origin,
                level: 1
            });
            console.log('[CharacterCreation] Game state initialized with character data');
        }

        // Emit event if eventManager is available
        if (window.eventManager && typeof window.eventManager.emit === 'function') {
            console.log('[CharacterCreation] Emitting character:created event');
            window.eventManager.emit('character:created', {
                origin: characterState.origin,
                vow: characterState.vow,
                mark: characterState.mark
            });
        } else {
            console.log('[CharacterCreation] EventManager not available, using direct transition');
        }

        // Direct transition to game interface
        transitionToGame();
    }

    /**
     * Transition from character creation to game interface
     */
    function transitionToGame() {
        console.log('[CharacterCreation] Starting transition to game interface');

        const characterCreation = document.getElementById('character-creation');
        const gameInterface = document.getElementById('game-interface');
        const gameView = document.getElementById('game-view');

        if (characterCreation) {
            characterCreation.style.display = 'none';
            characterCreation.classList.add('hidden');
            console.log('[CharacterCreation] Character creation hidden');
        }

        if (gameInterface) {
            gameInterface.classList.remove('hidden');
            gameInterface.style.display = 'block';
            console.log('[CharacterCreation] Game interface shown');
        }

        // Also show the game view if it exists
        if (gameView) {
            gameView.classList.remove('hidden');
            gameView.style.display = 'block';
            console.log('[CharacterCreation] Game view shown');
        }

        // Initialize ViewManager if available
        if (window.viewManager && typeof window.viewManager.navigateTo === 'function') {
            console.log('[CharacterCreation] Navigating to main-menu view');
            window.viewManager.navigateTo('main-menu').catch(err => {
                console.error('[CharacterCreation] Failed to navigate to main-menu:', err);
            });
        }

        // Update game state if available
        if (window.gameState && typeof window.gameState.set === 'function') {
            window.gameState.set('player.character.created', true);
            console.log('[CharacterCreation] Game state updated');
        }

        // Hide loading screen if still visible
        if (window.LoadingManager && typeof window.LoadingManager.hide === 'function') {
            window.LoadingManager.hide();
        }

        // Force page title update
        document.title = 'Game - Idle Cultivation';
    }

    /**
     * Update begin button state based on current selections
     */
    function updateBeginButton() {
        const beginBtn = document.getElementById('begin-cultivation');
        if (!beginBtn) {
            console.warn('[CharacterCreation] Begin button not found');
            return;
        }

        const allSelected = !!(characterState.origin && characterState.vow && characterState.mark);

        console.log('[CharacterCreation] Checking button state:', {
            origin: characterState.origin,
            vow: characterState.vow,
            mark: characterState.mark,
            allSelected,
            currentlyDisabled: beginBtn.disabled
        });

        if (allSelected) {
            beginBtn.disabled = false;
            beginBtn.classList.add('enabled');
            beginBtn.classList.remove('disabled');
            beginBtn.style.opacity = '1';
            beginBtn.style.cursor = 'pointer';
            console.log('[CharacterCreation] Begin button ENABLED');
        } else {
            beginBtn.disabled = true;
            beginBtn.classList.remove('enabled');
            beginBtn.classList.add('disabled');
            beginBtn.style.opacity = '0.5';
            beginBtn.style.cursor = 'not-allowed';
            console.log('[CharacterCreation] Begin button DISABLED');
        }
    }

    /**
     * Start polling to detect button state changes
     * This ensures the begin button is enabled/disabled correctly
     * even if the event system fails
     */
    function startPolling() {
        console.log('[CharacterCreation] Starting state polling...');

        setInterval(() => {
            // Check active/selected buttons and update state
            const originContainer = document.querySelector('.fragment-choices[data-category="origin"]');
            const vowContainer = document.querySelector('.fragment-choices[data-category="vow"]');
            const markContainer = document.querySelector('.fragment-choices[data-category="mark"]');

            const originActive = originContainer ?
                originContainer.querySelector('.fragment-choice.active, .fragment-choice.selected') : null;
            const vowActive = vowContainer ?
                vowContainer.querySelector('.fragment-choice.active, .fragment-choice.selected') : null;
            const markActive = markContainer ?
                markContainer.querySelector('.fragment-choice.active, .fragment-choice.selected') : null;

            // Update state based on active buttons
            const newState = {
                origin: originActive ? originActive.dataset.choice : characterState.origin,
                vow: vowActive ? vowActive.dataset.choice : characterState.vow,
                mark: markActive ? markActive.dataset.choice : characterState.mark
            };

            // Always update button state to ensure it's correct
            updateBeginButton();

            // Only log if state changed
            if (JSON.stringify(newState) !== JSON.stringify(characterState)) {
                Object.assign(characterState, newState);
                console.log('[CharacterCreation] State updated via polling:', characterState);
            }
        }, 100); // Poll every 100ms
    }

    /**
     * Check if character creation modal is visible
     */
    function isCharacterCreationVisible() {
        const modal = document.getElementById('character-creation');
        if (!modal) return false;

        const style = window.getComputedStyle(modal);
        return style.display !== 'none' && !modal.classList.contains('hidden');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCharacterCreation);
    } else {
        // DOM already loaded, initialize immediately
        initializeCharacterCreation();
    }

    // Also try after a short delay to ensure all elements are ready
    setTimeout(initializeCharacterCreation, 500);

    // Expose for debugging
    window.CharacterCreationFallback = {
        getState: () => ({ ...characterState }),
        isVisible: isCharacterCreationVisible,
        reinitialize: () => {
            isSetup = false;
            initializeCharacterCreation();
        }
    };

    console.log('[CharacterCreation] Module loaded');
})();