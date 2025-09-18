# Cultivation Game Development Principles

## Core Design Philosophy

### Idle Game Fundamentals
1. **Always Progressing**: Players should advance even when offline
2. **Meaningful Choices**: Decisions impact long-term progression
3. **Layered Complexity**: Simple start, deep endgame systems
4. **Respect Time**: Valuable progression per time invested
5. **No Dead Ends**: All paths lead to meaningful advancement

### Wuxia/Xianxia Authenticity
1. **Cultivation Stages**: Follow traditional realm progression
2. **Terminology**: Use authentic cultivation terms correctly
3. **Philosophy**: Incorporate themes of self-improvement and perseverance
4. **Power Fantasy**: Enable feeling of transcendent growth
5. **Social Hierarchy**: Respect for strength and wisdom

## Technical Implementation Standards

### Performance Requirements
- **60 FPS Minimum**: Smooth animations and transitions
- **Low Memory Usage**: Efficient state management
- **Battery Conscious**: Optimized for mobile devices
- **Offline Efficiency**: Fast calculation of offline progress
- **Save Reliability**: Robust state persistence

### Code Organization
- **System Isolation**: Clear boundaries between game systems
- **Event Architecture**: Loose coupling through events
- **State Validation**: Prevent invalid game states
- **Migration Support**: Handle save file version upgrades
- **Error Recovery**: Graceful handling of corrupted data

## Balance Guidelines

### Progression Curves
- **Exponential Base**: Each level requires more experience
- **Linear Time**: Consistent real-time advancement feel
- **Breakthrough Gates**: Major progression milestones
- **Catch-up Mechanics**: Help struggling players advance
- **Prestige Value**: Previous progress retains meaning

### Economy Design
- **Resource Diversity**: Multiple currencies serve different purposes
- **Sink Balance**: Consumption matches generation over time
- **Premium Integration**: Optional convenience, never power
- **Inflation Control**: Prevent currency value degradation
- **Trade-offs**: Meaningful resource allocation decisions

## Player Experience Priorities

### Onboarding Flow
1. **Immediate Engagement**: Quick initial progression
2. **System Introduction**: Gradual feature unlock
3. **Choice Introduction**: Simple decisions first
4. **Complexity Layering**: Advanced features when ready
5. **Success Celebration**: Recognition of achievements

### Retention Strategies
- **Daily Habits**: Regular login incentives
- **Social Connection**: Sect interaction benefits
- **Goal Setting**: Clear short and long-term objectives
- **Achievement Recognition**: Celebrate milestones
- **Continuous Growth**: Always another goal to pursue

## Quality Assurance Standards

### Testing Requirements
- **Progression Testing**: Verify advancement calculations
- **Balance Validation**: Confirm intended progression rates
- **Save/Load Testing**: Data integrity verification
- **Performance Profiling**: Frame rate and memory usage
- **Browser Compatibility**: Cross-platform functionality

### User Experience Validation
- **Accessibility**: Screen reader and keyboard navigation
- **Mobile Responsiveness**: Touch interface optimization
- **Loading Performance**: Minimize initial load time
- **Offline Behavior**: Graceful network disconnect handling
- **Error Communication**: Clear user-facing error messages