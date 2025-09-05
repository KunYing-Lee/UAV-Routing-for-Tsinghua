import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 修复Leaflet图标问题
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Map = ({ orders, drones, routes, selectedOrder, locations }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const droneMarkersRef = useRef({});
  const routeLinesRef = useRef([]);
  const locationMarkersRef = useRef({});

  // 清华大学边界坐标
  const tsinghuaBounds = [
    [39.99, 116.30], // 西南角
    [40.02, 116.35]  // 东北角
  ];

  useEffect(() => {
    if (!mapRef.current) return;

    // 初始化地图
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([40.005, 116.325], 16);
      
      // 添加OpenStreetMap图层
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // 设置地图边界
      mapInstanceRef.current.setMaxBounds(tsinghuaBounds);
      mapInstanceRef.current.setMinZoom(14);
    }

    const map = mapInstanceRef.current;

    // 清除现有标记和路线
    Object.values(markersRef.current).forEach(marker => marker.remove());
    Object.values(droneMarkersRef.current).forEach(marker => marker.remove());
    Object.values(locationMarkersRef.current).forEach(marker => marker.remove());
    routeLinesRef.current.forEach(line => line.remove());
    
    markersRef.current = {};
    droneMarkersRef.current = {};
    locationMarkersRef.current = {};
    routeLinesRef.current = [];

    // 绘制地点标记
    if (locations) {
      drawLocationMarkers(map, locations);
    }

    // 绘制航线网络
    if (routes && routes.routes) {
      drawRouteNetwork(map, routes);
    }

    // 绘制订单标记
    orders.forEach(order => {
      drawOrderMarkers(map, order);
    });

    // 绘制无人机
    drones.forEach(drone => {
      drawDroneMarker(map, drone);
    });

    // 绘制选中订单的路线
    if (selectedOrder) {
      drawSelectedOrderRoute(map, selectedOrder);
    }

  }, [orders, drones, routes, selectedOrder, locations]);

  // 绘制航线网络
  const drawRouteNetwork = (map, routes) => {
    const allRoutes = [...routes.routes.canteen_to_dorm, ...routes.routes.gate_to_dorm];
    
    allRoutes.forEach((route, index) => {
      if (route.path && route.path.length > 1) {
        const pathCoords = route.path.map(coord => [coord[1], coord[0]]);
        const line = L.polyline(pathCoords, {
          color: route.height === 100 ? '#3498db' : '#e74c3c',
          weight: 1,
          opacity: 0.6,
          dashArray: '5, 5'
        }).addTo(map);
        
        routeLinesRef.current.push(line);
      }
    });
  };

  // 绘制订单标记
  const drawOrderMarkers = (map, order) => {
    const startIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #2ecc71; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const endIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #e74c3c; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    // 起点标记
    const startMarker = L.marker([order.startPoint[1], order.startPoint[0]], {
      icon: startIcon
    }).addTo(map);
    
    startMarker.bindPopup(`
      <div>
        <h4>订单起点</h4>
        <p><strong>订单号:</strong> ${order.orderNumber}</p>
        <p><strong>状态:</strong> ${getStatusText(order.status)}</p>
        <p><strong>创建时间:</strong> ${new Date(order.createTime).toLocaleString()}</p>
      </div>
    `);

    // 终点标记
    const endMarker = L.marker([order.endPoint[1], order.endPoint[0]], {
      icon: endIcon
    }).addTo(map);
    
    endMarker.bindPopup(`
      <div>
        <h4>订单终点</h4>
        <p><strong>订单号:</strong> ${order.orderNumber}</p>
        <p><strong>状态:</strong> ${getStatusText(order.status)}</p>
        <p><strong>创建时间:</strong> ${new Date(order.createTime).toLocaleString()}</p>
      </div>
    `);

    markersRef.current[`start_${order.id}`] = startMarker;
    markersRef.current[`end_${order.id}`] = endMarker;
  };

  // 绘制无人机标记
  const drawDroneMarker = (map, drone) => {
    const droneIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          background-color: #f39c12; 
          width: 24px; 
          height: 24px; 
          border-radius: 50%; 
          border: 3px solid white; 
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">
          🚁
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const position = drone.currentPosition || drone.targetPosition;
    const droneMarker = L.marker([position[1], position[0]], {
      icon: droneIcon
    }).addTo(map);

    droneMarker.bindPopup(`
      <div>
        <h4>无人机状态</h4>
        <p><strong>无人机ID:</strong> ${drone.id}</p>
        <p><strong>订单ID:</strong> ${drone.orderId}</p>
        <p><strong>状态:</strong> ${getDroneStatusText(drone.status)}</p>
        <p><strong>高度:</strong> ${drone.altitude}m</p>
        <p><strong>速度:</strong> ${drone.speed}m/s</p>
      </div>
    `);

    droneMarkersRef.current[drone.id] = droneMarker;

    // 绘制无人机飞行轨迹
    if (drone.path && drone.path.length > 1) {
      const pathCoords = drone.path.map(coord => [coord[1], coord[0]]);
      const flightPath = L.polyline(pathCoords, {
        color: '#f39c12',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(map);
      
      routeLinesRef.current.push(flightPath);
    }
  };

  // 绘制选中订单的路线
  const drawSelectedOrderRoute = (map, order) => {
    const drone = drones.find(d => d.orderId === order.id);
    if (drone && drone.path && drone.path.length > 1) {
      const pathCoords = drone.path.map(coord => [coord[1], coord[0]]);
      const selectedRoute = L.polyline(pathCoords, {
        color: '#9b59b6',
        weight: 4,
        opacity: 0.9
      }).addTo(map);
      
      routeLinesRef.current.push(selectedRoute);
    }
  };

  // 绘制地点标记
  const drawLocationMarkers = (map, locations) => {
    // 绘制校门
    locations.gates.forEach(gate => {
      const gateIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #e67e22; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const gateMarker = L.marker([gate.coords[1], gate.coords[0]], {
        icon: gateIcon
      }).addTo(map);
      
      gateMarker.bindPopup(`
        <div>
          <h4>🚪 ${gate.name}</h4>
          <p><strong>类型:</strong> 校门</p>
        </div>
      `);

      locationMarkersRef.current[`gate_${gate.id}`] = gateMarker;
    });

    // 绘制食堂
    locations.canteens.forEach(canteen => {
      const canteenIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #f39c12; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const canteenMarker = L.marker([canteen.coords[1], canteen.coords[0]], {
        icon: canteenIcon
      }).addTo(map);
      
      canteenMarker.bindPopup(`
        <div>
          <h4>🍽️ ${canteen.name}</h4>
          <p><strong>类型:</strong> 食堂</p>
        </div>
      `);

      locationMarkersRef.current[`canteen_${canteen.id}`] = canteenMarker;
    });

    // 绘制宿舍
    locations.dorms.forEach(dorm => {
      const dormIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #3498db; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const dormMarker = L.marker([dorm.coords[1], dorm.coords[0]], {
        icon: dormIcon
      }).addTo(map);
      
      dormMarker.bindPopup(`
        <div>
          <h4>🏠 ${dorm.name}</h4>
          <p><strong>类型:</strong> 宿舍</p>
        </div>
      `);

      locationMarkersRef.current[`dorm_${dorm.id}`] = dormMarker;
    });
  };

  // 获取状态文本
  const getStatusText = (status) => {
    const statusMap = {
      'pending': '待分配',
      'assigned': '已分配',
      'delivering': '配送中',
      'completed': '已完成'
    };
    return statusMap[status] || status;
  };

  // 获取无人机状态文本
  const getDroneStatusText = (status) => {
    const statusMap = {
      'assigned': '已分配',
      'delivering': '飞行中',
      'completed': '已完成'
    };
    return statusMap[status] || status;
  };

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        zIndex: 1
      }} 
    />
  );
};

export default Map; 