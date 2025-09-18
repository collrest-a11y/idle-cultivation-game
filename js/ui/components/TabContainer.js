/**
 * TabContainer - Multi-tab interface component with state persistence
 * Extends BaseComponent with tab management functionality
 */
class TabContainer extends BaseComponent {
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            className: 'tab-container',
            defaultTab: 0,
            persistState: true,
            storageKey: null,
            closable: false,
            addable: false,
            draggable: false,
            lazy: true,
            animated: true,
            position: 'top', // top, bottom, left, right
            alignment: 'start', // start, center, end, justify
            size: 'medium', // small, medium, large
            style: 'default', // default, pills, underline, cards
            responsive: true,
            keyboard: true,
            maxTabs: null,
            minTabs: 1
        };
    }

    getInitialState() {
        return {
            activeTab: this.options.defaultTab,
            tabs: [],
            loadedTabs: new Set(),
            history: []
        };
    }

    onInit() {
        // Generate storage key if persistence is enabled
        if (this.options.persistState && !this.options.storageKey) {
            this.options.storageKey = `tab-container-${this.id}`;
        }

        // Load persisted state
        if (this.options.persistState) {
            this.loadPersistedState();
        }

        // Initialize tabs from options
        if (this.options.tabs) {
            this.setTabs(this.options.tabs);
        }
    }

    createElement() {
        // Create main container
        this.element = document.createElement('div');
        this.element.className = `tab-container ${this.options.className} tab-${this.options.style} tab-position-${this.options.position} tab-size-${this.options.size}`;
        this.element.id = this.id;

        // ARIA attributes
        this.element.setAttribute('role', 'tablist');
        if (this.options.label) {
            this.element.setAttribute('aria-label', this.options.label);
        }

        // Create tab navigation
        this.createTabNav();

        // Create tab content area
        this.createTabContent();

        // Apply alignment
        this.tabNav.classList.add(`tab-align-${this.options.alignment}`);
    }

    createTabNav() {
        this.tabNav = document.createElement('div');
        this.tabNav.className = 'tab-nav';
        this.tabNav.setAttribute('role', 'tablist');

        // Tab list
        this.tabList = document.createElement('ul');
        this.tabList.className = 'tab-list';
        this.tabNav.appendChild(this.tabList);

        // Add button (if enabled)
        if (this.options.addable) {
            this.addButton = document.createElement('button');
            this.addButton.className = 'tab-add-btn';
            this.addButton.innerHTML = '+';
            this.addButton.setAttribute('aria-label', 'Add tab');
            this.addButton.type = 'button';
            this.tabNav.appendChild(this.addButton);
        }

        this.element.appendChild(this.tabNav);
    }

    createTabContent() {
        this.tabContent = document.createElement('div');
        this.tabContent.className = 'tab-content';
        this.element.appendChild(this.tabContent);
    }

    render() {
        this.renderTabs();
        this.renderContent();
    }

    renderTabs() {
        // Clear existing tabs
        this.tabList.innerHTML = '';

        // Render each tab
        this.state.tabs.forEach((tab, index) => {
            const tabItem = this.createTabItem(tab, index);
            this.tabList.appendChild(tabItem);
        });

        // Update active tab
        this.updateActiveTab();
    }

    createTabItem(tab, index) {
        const li = document.createElement('li');
        li.className = 'tab-item';
        li.setAttribute('role', 'presentation');

        const button = document.createElement('button');
        button.className = 'tab-button';
        button.textContent = tab.title;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', `${this.id}-panel-${index}`);
        button.setAttribute('aria-selected', index === this.state.activeTab ? 'true' : 'false');
        button.setAttribute('tabindex', index === this.state.activeTab ? '0' : '-1');
        button.id = `${this.id}-tab-${index}`;
        button.type = 'button';

        // Icon
        if (tab.icon) {
            const icon = document.createElement('span');
            icon.className = `tab-icon ${tab.icon}`;
            button.insertBefore(icon, button.firstChild);
        }

        // Badge
        if (tab.badge) {
            const badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = tab.badge;
            button.appendChild(badge);
        }

        // Close button
        if (this.options.closable && tab.closable !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('aria-label', `Close ${tab.title}`);
            closeBtn.type = 'button';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(index);
            });
            button.appendChild(closeBtn);
        }

        // Disabled state
        if (tab.disabled) {
            button.disabled = true;
            li.classList.add('tab-disabled');
        }

        // Click handler
        button.addEventListener('click', () => {
            this.setActiveTab(index);
        });

        li.appendChild(button);
        return li;
    }

    renderContent() {
        // Clear existing content
        this.tabContent.innerHTML = '';

        // Render panels
        this.state.tabs.forEach((tab, index) => {
            const panel = this.createTabPanel(tab, index);
            this.tabContent.appendChild(panel);
        });
    }

    createTabPanel(tab, index) {
        const panel = document.createElement('div');
        panel.className = 'tab-panel';
        panel.id = `${this.id}-panel-${index}`;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', `${this.id}-tab-${index}`);
        panel.setAttribute('tabindex', '0');

        // Show/hide based on active state
        if (index === this.state.activeTab) {
            panel.classList.add('tab-panel-active');
            panel.setAttribute('aria-hidden', 'false');
        } else {
            panel.classList.add('tab-panel-hidden');
            panel.setAttribute('aria-hidden', 'true');
        }

        // Lazy loading
        if (this.options.lazy && !this.state.loadedTabs.has(index) && index !== this.state.activeTab) {
            panel.innerHTML = '<div class="tab-loading">Loading...</div>';
        } else {
            this.loadTabContent(panel, tab, index);
            this.state.loadedTabs.add(index);
        }

        return panel;
    }

    loadTabContent(panel, tab, index) {
        if (typeof tab.content === 'string') {
            panel.innerHTML = tab.content;
        } else if (tab.content instanceof HTMLElement) {
            panel.innerHTML = '';
            panel.appendChild(tab.content);
        } else if (typeof tab.content === 'function') {
            const content = tab.content();
            if (content instanceof Promise) {
                panel.innerHTML = '<div class="tab-loading">Loading...</div>';
                content.then(result => {
                    panel.innerHTML = '';
                    if (typeof result === 'string') {
                        panel.innerHTML = result;
                    } else if (result instanceof HTMLElement) {
                        panel.appendChild(result);
                    }
                });
            } else {
                if (typeof content === 'string') {
                    panel.innerHTML = content;
                } else if (content instanceof HTMLElement) {
                    panel.innerHTML = '';
                    panel.appendChild(content);
                }
            }
        } else if (tab.component) {
            // Load component
            panel.innerHTML = '';
            if (tab.component.mount) {
                tab.component.mount(panel);
            } else {
                panel.appendChild(tab.component.element || tab.component);
            }
        }
    }

    setupEventListeners() {
        // Keyboard navigation
        if (this.options.keyboard) {
            this.tabList.addEventListener('keydown', (e) => {
                this.handleKeyboardNavigation(e);
            });
        }

        // Add button
        if (this.addButton) {
            this.addButton.addEventListener('click', () => {
                this.emit('tab:add-requested');
                if (this.options.onAddTab) {
                    this.options.onAddTab.call(this);
                }
            });
        }

        // Drag and drop (if enabled)
        if (this.options.draggable) {
            this.setupDragAndDrop();
        }

        // Window unload (for persistence)
        if (this.options.persistState) {
            window.addEventListener('beforeunload', () => {
                this.saveState();
            });
        }
    }

    setupDragAndDrop() {
        let draggedItem = null;

        this.tabList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('tab-button')) {
                draggedItem = e.target.closest('.tab-item');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', draggedItem.outerHTML);
                draggedItem.classList.add('tab-dragging');
            }
        });

        this.tabList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        this.tabList.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedItem) {
                const targetItem = e.target.closest('.tab-item');
                if (targetItem && targetItem !== draggedItem) {
                    const dragIndex = Array.from(this.tabList.children).indexOf(draggedItem);
                    const targetIndex = Array.from(this.tabList.children).indexOf(targetItem);
                    this.moveTab(dragIndex, targetIndex);
                }
            }
        });

        this.tabList.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('tab-dragging');
                draggedItem = null;
            }
        });
    }

    handleKeyboardNavigation(e) {
        const tabs = Array.from(this.tabList.querySelectorAll('.tab-button:not(:disabled)'));
        const currentIndex = tabs.indexOf(document.activeElement);

        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = tabs.length - 1;
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (currentIndex >= 0) {
                    this.setActiveTab(currentIndex);
                }
                return;
        }

        if (newIndex !== currentIndex) {
            tabs[newIndex].focus();
        }
    }

    /**
     * Set tabs
     */
    setTabs(tabs) {
        this.setState({ tabs: [...tabs] });

        // Reset loaded tabs if lazy loading
        if (this.options.lazy) {
            this.setState({ loadedTabs: new Set() });
        }

        // Validate active tab
        if (this.state.activeTab >= tabs.length) {
            this.setActiveTab(Math.max(0, tabs.length - 1));
        }

        this.render();
    }

    /**
     * Add new tab
     */
    addTab(tab, index = null) {
        if (this.options.maxTabs && this.state.tabs.length >= this.options.maxTabs) {
            return false;
        }

        const newTabs = [...this.state.tabs];

        if (index === null) {
            newTabs.push(tab);
            index = newTabs.length - 1;
        } else {
            newTabs.splice(index, 0, tab);
        }

        this.setState({ tabs: newTabs });
        this.render();

        this.emit('tab:added', { tab, index });
        this.saveState();

        return true;
    }

    /**
     * Remove tab
     */
    removeTab(index) {
        if (this.state.tabs.length <= this.options.minTabs) {
            return false;
        }

        const tab = this.state.tabs[index];
        const newTabs = [...this.state.tabs];
        newTabs.splice(index, 1);

        // Adjust active tab
        let newActiveTab = this.state.activeTab;
        if (index === this.state.activeTab) {
            newActiveTab = Math.min(index, newTabs.length - 1);
        } else if (index < this.state.activeTab) {
            newActiveTab = this.state.activeTab - 1;
        }

        this.setState({
            tabs: newTabs,
            activeTab: newActiveTab
        });

        // Remove from loaded tabs
        const newLoadedTabs = new Set(this.state.loadedTabs);
        newLoadedTabs.delete(index);
        // Adjust indices for loaded tabs
        const adjustedLoadedTabs = new Set();
        for (const loadedIndex of newLoadedTabs) {
            if (loadedIndex < index) {
                adjustedLoadedTabs.add(loadedIndex);
            } else if (loadedIndex > index) {
                adjustedLoadedTabs.add(loadedIndex - 1);
            }
        }
        this.setState({ loadedTabs: adjustedLoadedTabs });

        this.render();

        this.emit('tab:removed', { tab, index });
        this.saveState();

        return true;
    }

    /**
     * Close tab (alias for removeTab with beforeClose callback)
     */
    closeTab(index) {
        const tab = this.state.tabs[index];

        // Call beforeClose callback if present
        if (tab.beforeClose) {
            const result = tab.beforeClose(tab, index);
            if (result === false || (result instanceof Promise && result.then)) {
                if (result instanceof Promise) {
                    result.then(confirmed => {
                        if (confirmed !== false) {
                            this.removeTab(index);
                        }
                    });
                }
                return;
            }
        }

        return this.removeTab(index);
    }

    /**
     * Move tab to new position
     */
    moveTab(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;

        const newTabs = [...this.state.tabs];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);

        // Adjust active tab index
        let newActiveTab = this.state.activeTab;
        if (fromIndex === this.state.activeTab) {
            newActiveTab = toIndex;
        } else if (fromIndex < this.state.activeTab && toIndex >= this.state.activeTab) {
            newActiveTab = this.state.activeTab - 1;
        } else if (fromIndex > this.state.activeTab && toIndex <= this.state.activeTab) {
            newActiveTab = this.state.activeTab + 1;
        }

        this.setState({
            tabs: newTabs,
            activeTab: newActiveTab
        });

        this.render();

        this.emit('tab:moved', { fromIndex, toIndex, tab: movedTab });
        this.saveState();
    }

    /**
     * Set active tab
     */
    setActiveTab(index) {
        if (index < 0 || index >= this.state.tabs.length) {
            return;
        }

        const tab = this.state.tabs[index];
        if (tab.disabled) {
            return;
        }

        const previousTab = this.state.activeTab;

        this.setState({ activeTab: index });

        // Add to history
        const newHistory = [...this.state.history];
        if (newHistory[newHistory.length - 1] !== previousTab) {
            newHistory.push(previousTab);
        }
        if (newHistory.length > 10) { // Limit history size
            newHistory.shift();
        }
        this.setState({ history: newHistory });

        // Load content if lazy loading
        if (this.options.lazy && !this.state.loadedTabs.has(index)) {
            const panel = this.tabContent.children[index];
            if (panel) {
                this.loadTabContent(panel, tab, index);
                const newLoadedTabs = new Set(this.state.loadedTabs);
                newLoadedTabs.add(index);
                this.setState({ loadedTabs: newLoadedTabs });
            }
        }

        this.updateActiveTab();

        this.emit('tab:changed', {
            previousTab,
            activeTab: index,
            tab
        });

        this.saveState();

        // Call tab's onActivate callback
        if (tab.onActivate) {
            tab.onActivate(tab, index);
        }
    }

    updateActiveTab() {
        // Update tab buttons
        const tabButtons = this.tabList.querySelectorAll('.tab-button');
        tabButtons.forEach((button, index) => {
            const isActive = index === this.state.activeTab;
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.setAttribute('tabindex', isActive ? '0' : '-1');
            button.classList.toggle('tab-active', isActive);
        });

        // Update panels
        const panels = this.tabContent.querySelectorAll('.tab-panel');
        panels.forEach((panel, index) => {
            const isActive = index === this.state.activeTab;
            panel.classList.toggle('tab-panel-active', isActive);
            panel.classList.toggle('tab-panel-hidden', !isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
    }

    /**
     * Get active tab
     */
    getActiveTab() {
        return this.state.tabs[this.state.activeTab];
    }

    /**
     * Get active tab index
     */
    getActiveIndex() {
        return this.state.activeTab;
    }

    /**
     * Get tab by index
     */
    getTab(index) {
        return this.state.tabs[index];
    }

    /**
     * Update tab properties
     */
    updateTab(index, updates) {
        const newTabs = [...this.state.tabs];
        newTabs[index] = { ...newTabs[index], ...updates };
        this.setState({ tabs: newTabs });
        this.render();
    }

    /**
     * Load persisted state
     */
    loadPersistedState() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                const state = JSON.parse(saved);
                if (state.activeTab !== undefined) {
                    this.setState({ activeTab: state.activeTab }, { render: false });
                }
                if (state.tabs) {
                    this.setState({ tabs: state.tabs }, { render: false });
                }
            }
        } catch (error) {
            console.warn('TabContainer: Failed to load persisted state', error);
        }
    }

    /**
     * Save current state
     */
    saveState() {
        if (!this.options.persistState) return;

        try {
            const state = {
                activeTab: this.state.activeTab,
                tabs: this.state.tabs.map(tab => ({
                    title: tab.title,
                    icon: tab.icon,
                    badge: tab.badge,
                    disabled: tab.disabled,
                    closable: tab.closable
                    // Don't persist content/components
                }))
            };
            localStorage.setItem(this.options.storageKey, JSON.stringify(state));
        } catch (error) {
            console.warn('TabContainer: Failed to save state', error);
        }
    }

    onDestroy() {
        // Save state before destroying
        if (this.options.persistState) {
            this.saveState();
        }

        // Clean up event listeners
        window.removeEventListener('beforeunload', this.saveState);
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TabContainer };
} else if (typeof window !== 'undefined') {
    window.TabContainer = TabContainer;
}