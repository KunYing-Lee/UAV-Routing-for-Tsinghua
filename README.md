# UAV-Based Food Delivery Routing for Tsinghua University

A drone delivery system designed specifically for Tsinghua University campus, featuring intelligent route planning, real-time simulation, and interactive visualization.

## 🚁 Overview

This project implements a UAV (Unmanned Aerial Vehicle) food delivery system for Tsinghua University, combining sophisticated pathfinding algorithms with a modern web-based simulation interface. The system optimizes delivery routes from campus gates and canteens to student dormitories while avoiding obstacles and maintaining safe flight altitudes.

## ✨ Key Features

### 🗺️ Intelligent Route Planning
- **A* Pathfinding Algorithm**: Advanced pathfinding with obstacle avoidance
- **Multi-layered Flight Altitudes**: 50m (low), 75m (medium), 100m (high) for different route types
- **Obstacle Detection**: Automatic avoidance of buildings and sports facilities
- **Route Optimization**: Pre-computed optimal paths for all campus locations

### 🎮 Real-time Simulation
- **Interactive Web Interface**: Modern React-based dashboard
- **Live Drone Tracking**: Real-time position updates and flight progress
- **Speed Control**: Adjustable simulation speeds (1X, 2X, 3X, 5X)
- **Order Management**: Dynamic order creation and assignment

### 📊 Comprehensive Visualization
- **Interactive Map**: Leaflet-based mapping with campus overlay
- **Route Network**: Visual representation of all planned flight paths
- **Status Monitoring**: Real-time drone status and delivery progress
- **Analytics Dashboard**: Route statistics and performance metrics

## 🏗️ System Architecture

### Backend Components
- **Route Planner** (`route_planner.py`): Core pathfinding and route optimization
- **Data Processing**: GeoJSON data handling for campus infrastructure
- **Route Analysis**: Statistical analysis of flight paths and performance

### Frontend Components
- **Main Dashboard** (`App.js`): Central control interface
- **Interactive Map** (`Map.js`): Real-time visualization with Leaflet
- **Order Panel** (`OrderPanel.js`): Order creation and management
- **Drone Status** (`DroneStatus.js`): Live monitoring and progress tracking

## 📁 Project Structure

```
drone_delivery/
├── data/                          # Campus geographic data
│   ├── buildings.geojson         # Building polygons
│   ├── canteens.geojson          # Canteen locations
│   ├── dorms_sorted.geojson      # Student dormitories
│   ├── gates.geojson             # Campus gates
│   ├── sports.geojson            # Sports facilities
│   ├── roads.geojson             # Road network
│   └── campus_boundary.geojson   # Campus boundary
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── Map.js               # Interactive map
│   │   ├── OrderPanel.js        # Order management
│   │   └── DroneStatus.js       # Drone monitoring
│   ├── App.js                   # Main application
│   └── App.css                  # Styling
├── route_planner.py             # Core pathfinding engine
├── sort_dorms.py               # Dormitory data processing
└── package.json                # Dependencies
```

## 🚀 Getting Started

### Prerequisites
- Python 3.7+
- Node.js 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd drone_delivery
   ```

2. **Install Python dependencies**
   ```bash
   pip install numpy matplotlib shapely
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

### Running the System

1. **Generate Route Data**
   ```bash
   python route_planner.py
   ```
   This will create `route_planning_results.json` and `drone_delivery_routes.png`

2. **Start the Web Application**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`

## 🎯 Usage Guide

### Creating Orders
1. Click "添加订单" (Add Order) in the order panel
2. Select a starting point (campus gate or canteen)
3. Choose a destination (student dormitory)
4. Add optional order description
5. Submit the order

### Running Simulations
1. Click "🚀 开始模拟" (Start Simulation) to begin
2. Adjust simulation speed using the speed controls
3. Monitor drone progress in real-time
4. View detailed flight paths on the interactive map

### Monitoring System
- **Order Status**: Track order progress from pending to completed
- **Drone Status**: Monitor individual drone locations and flight progress
- **Route Visualization**: View optimized flight paths and campus infrastructure

## 🧮 Technical Details

### Pathfinding Algorithm
- **A* Algorithm**: Optimal pathfinding with heuristic optimization
- **Grid-based Navigation**: 0.0001° resolution for precise routing
- **Obstacle Avoidance**: Dynamic avoidance of buildings and restricted areas
- **Multi-level Routing**: Different altitude layers for various route types

### Data Processing
- **GeoJSON Integration**: Seamless handling of campus geographic data
- **Coordinate Transformation**: Precise lat/lng to grid conversion
- **Polygon Processing**: Efficient building and facility boundary detection

### Performance Optimization
- **Pre-computed Routes**: All possible paths calculated offline
- **Efficient Data Structures**: Optimized for real-time simulation
- **Memory Management**: Streamlined data handling for large datasets

## 📊 Route Statistics

The system generates comprehensive statistics including:
- Total number of routes planned
- Average route lengths
- Route distribution by type (canteen-to-dorm, gate-to-dorm)
- Performance metrics and optimization results

## 🛡️ Safety Features

- **Altitude Management**: Multi-layered flight heights for safety
- **Obstacle Avoidance**: Automatic detection and avoidance of buildings
- **Buffer Zones**: Safety margins around sports facilities
- **Boundary Enforcement**: Campus boundary compliance

## 🔧 Configuration

### Flight Parameters
- **Default Speed**: 10 m/s
- **Altitude Levels**: 50m, 75m, 100m
- **Grid Resolution**: 0.0001° (~11m)
- **Buffer Distance**: 50m around sports facilities

### Simulation Settings
- **Update Interval**: Configurable based on simulation speed
- **Path Resolution**: 20 waypoints per route
- **Status Updates**: Real-time position tracking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This system is designed for educational and research purposes. Actual drone operations must comply with local aviation regulations and safety requirements.
