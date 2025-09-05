import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import OrderPanel from './components/OrderPanel';
import DroneStatus from './components/DroneStatus';
import './App.css';

function App() {
  const [orders, setOrders] = useState([]);
  const [drones, setDrones] = useState([]);
  const [routes, setRoutes] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [locations, setLocations] = useState({
    gates: [],
    canteens: [],
    dorms: []
  });
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1X, 2X, 3X, 5X

  // 倍速选项
  const speedOptions = [
    { value: 1, label: '1X', icon: '🐌' },
    { value: 2, label: '2X', icon: '🏃' },
    { value: 3, label: '3X', icon: '🚀' },
    { value: 5, label: '5X', icon: '⚡' }
  ];

  // 获取当前倍速的显示文本
  const getCurrentSpeedText = () => {
    const option = speedOptions.find(opt => opt.value === simulationSpeed);
    return option ? `${option.icon} ${option.label}` : '1X';
  };

  // 计算更新间隔（毫秒）
  const getUpdateInterval = () => {
    return 1000 / simulationSpeed; // 基础1秒除以倍速
  };

  // 加载GeoJSON数据
  useEffect(() => {
    const loadGeoJSONData = async () => {
      setIsLoading(true);
      try {
        // 加载校门数据
        const gatesResponse = await fetch('/data/gates.geojson');
        const gatesData = await gatesResponse.json();
        
        // 加载食堂数据
        const canteensResponse = await fetch('/data/canteens.geojson');
        const canteensData = await canteensResponse.json();
        
        // 加载宿舍数据
        const dormsResponse = await fetch('/data/dorms_sorted.geojson');
        const dormsData = await dormsResponse.json();

        // 提取地点信息
        const gates = gatesData.features.map((feature, index) => ({
          id: `gate_${index + 1}`,
          name: feature.properties.name,
          coords: feature.geometry.coordinates,
          type: 'gate'
        }));

        const canteens = canteensData.features.map((feature, index) => ({
          id: `canteen_${index + 1}`,
          name: feature.properties.name || feature.properties['name:zh'] || `食堂${index + 1}`,
          coords: feature.geometry.coordinates[0][0], // 取多边形的第一个点
          type: 'canteen'
        }));

        const dorms = dormsData.features.map((feature, index) => ({
          id: `dorm_${index + 1}`,
          name: feature.properties.name || feature.properties['name:zh'] || `宿舍${index + 1}`,
          coords: feature.geometry.coordinates[0][0], // 取多边形的第一个点
          type: 'dorm'
        }));

        setLocations({ gates, canteens, dorms });
        console.log('地点数据加载完成:', { gates, canteens, dorms });
        console.log('校门数量:', gates.length);
        console.log('食堂数量:', canteens.length);
        console.log('宿舍数量:', dorms.length);
        
        // 显示前几个地点的详细信息
        console.log('前3个校门:', gates.slice(0, 3));
        console.log('前3个食堂:', canteens.slice(0, 3));
        console.log('前3个宿舍:', dorms.slice(0, 3));
        
        // 检查航线数据
        console.log('航线数据状态:', routes ? '已加载' : '未加载');
        if (routes) {
          console.log('食堂到宿舍航线数量:', routes.routes?.canteen_to_dorm?.length || 0);
          console.log('校门到宿舍航线数量:', routes.routes?.gate_to_dorm?.length || 0);
          if (routes.routes?.canteen_to_dorm?.length > 0) {
            console.log('第一条食堂到宿舍航线:', routes.routes.canteen_to_dorm[0]);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('加载地点数据失败:', error);
        // 使用默认数据
        setLocations({
          gates: [
            { id: 'gate_1', name: '东门', coords: [116.325263, 40.0053343], type: 'gate' },
            { id: 'gate_2', name: '西门', coords: [116.315263, 40.0053343], type: 'gate' },
            { id: 'gate_3', name: '南门', coords: [116.320263, 40.0003343], type: 'gate' }
          ],
          canteens: [
            { id: 'canteen_1', name: '观畴园餐厅（万人大食堂）', coords: [116.315263, 40.0053343], type: 'canteen' },
            { id: 'canteen_2', name: '紫荆园餐厅', coords: [116.322763, 40.0103343], type: 'canteen' },
            { id: 'canteen_3', name: '清芬园餐厅', coords: [116.318763, 40.0073343], type: 'canteen' }
          ],
          dorms: [
            { id: 'dorm_1', name: '紫荆学生公寓1号楼', coords: [116.320263, 40.0103343], type: 'dorm' },
            { id: 'dorm_2', name: '紫荆学生公寓2号楼', coords: [116.321263, 40.0103343], type: 'dorm' },
            { id: 'dorm_3', name: '紫荆学生公寓3号楼', coords: [116.322263, 40.0103343], type: 'dorm' }
          ]
        });
        
        setIsLoading(false);
      }
    };

    loadGeoJSONData();
  }, []);

  // 加载航线数据
  useEffect(() => {
    console.log('开始加载航线数据...');
    
    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    fetch('/route_planning_results.json', {
      signal: controller.signal
    })
      .then(response => {
        console.log('航线数据响应状态:', response.status, response.statusText);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        clearTimeout(timeoutId);
        setRoutes(data);
        console.log('航线数据加载完成:', data);
        console.log('食堂到宿舍航线数量:', data.routes?.canteen_to_dorm?.length || 0);
        console.log('校门到宿舍航线数量:', data.routes?.gate_to_dorm?.length || 0);
        if (data.routes?.canteen_to_dorm?.length > 0) {
          console.log('第一条食堂到宿舍航线:', data.routes.canteen_to_dorm[0]);
          console.log('航线起点坐标:', data.routes.canteen_to_dorm[0].path[0]);
          console.log('航线终点坐标:', data.routes.canteen_to_dorm[0].path[data.routes.canteen_to_dorm[0].path.length - 1]);
        }
      })
      .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.error('航线数据加载超时');
        } else {
          console.error('加载航线数据失败:', error);
        }
        // 使用示例数据
        setRoutes({
          routes: {
            canteen_to_dorm: [],
            gate_to_dorm: []
          }
        });
      });
  }, []);

  // 添加新订单
  const addOrder = (orderData) => {
    const newOrder = {
      id: `ORDER_${Date.now()}`,
      orderNumber: `THU_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      createTime: new Date().toISOString(),
      status: 'pending', // pending, assigned, delivering, completed
      ...orderData
    };
    
    setOrders(prev => [...prev, newOrder]);
    
    // 如果模拟正在运行，自动分配无人机
    if (isSimulationRunning) {
      assignDroneToOrder(newOrder);
    }
  };

  // 分配无人机到订单
  const assignDroneToOrder = (order) => {
    console.log('分配无人机到订单:', order.id, '起点:', order.startPoint, '终点:', order.endPoint);
    
    // 尝试找到匹配的实际航线
    let flightPath = null;
    let altitude = 75; // 默认高度
    
    if (routes) {
      const bestRoute = findBestRoute(order.startPoint, order.endPoint);
      if (bestRoute) {
        flightPath = bestRoute.path;
        altitude = bestRoute.height || 75;
        console.log('使用实际航线:', bestRoute.from, '->', bestRoute.to, '高度:', altitude);
      }
    }
    
    // 如果没有找到匹配的航线，生成直线路径
    if (!flightPath) {
      flightPath = generateFlightPath(order.startPoint, order.endPoint);
      console.log('使用生成的直线路径');
    }
    
    console.log('最终飞行路径:', flightPath);
    
    const availableDrone = {
      id: `DRONE_${Date.now()}`,
      orderId: order.id,
      status: 'assigned',
      startPosition: order.startPoint,
      targetPosition: order.endPoint,
      path: flightPath,
      currentPosition: order.startPoint,
      pathIndex: 0,
      speed: 10, // 米/秒
      altitude: altitude
    };
    
    console.log('创建的无人机对象:', availableDrone);
    
    setDrones(prev => [...prev, availableDrone]);
    
    // 更新订单状态
    setOrders(prev => 
      prev.map(o => 
        o.id === order.id ? { ...o, status: 'assigned' } : o
      )
    );
  };

  // 查找最佳航线
  const findBestRoute = (start, end) => {
    if (!routes) {
      console.log('航线数据未加载');
      return null;
    }
    
    console.log('查找航线，起点坐标:', start, '终点坐标:', end);
    
    // 根据起点和终点查找匹配的航线
    const allRoutes = [...routes.routes.canteen_to_dorm, ...routes.routes.gate_to_dorm];
    console.log('总航线数量:', allRoutes.length);
    
    // 找到匹配的航线（通过比较坐标）
    const matchedRoute = allRoutes.find((route, index) => {
      if (!route.path || route.path.length === 0) {
        console.log(`航线${index}没有路径数据`);
        return false;
      }
      
      const routeStart = route.path[0];
      const routeEnd = route.path[route.path.length - 1];
      
      console.log(`检查航线${index}:`, route.from, '->', route.to);
      console.log('航线起点:', routeStart, '航线终点:', routeEnd);
      
      // 检查起点是否匹配
      const startMatches = isCoordinateNear(start, routeStart);
      // 检查终点是否匹配
      const endMatches = isCoordinateNear(end, routeEnd);
      
      console.log('起点匹配:', startMatches, '终点匹配:', endMatches);
      
      return startMatches && endMatches;
    });
    
    if (matchedRoute) {
      console.log('找到匹配航线:', matchedRoute.from, '->', matchedRoute.to);
      return matchedRoute;
    }
    
    // 如果没有找到匹配的航线，返回null
    console.log('未找到匹配航线，起点:', start, '终点:', end);
    return null;
  };

  // 检查两个坐标是否接近（允许一定的误差）
  const isCoordinateNear = (coord1, coord2) => {
    if (!coord1 || !coord2) return false;
    
    const latDiff = Math.abs(coord1[1] - coord2[1]);
    const lngDiff = Math.abs(coord1[0] - coord2[0]);
    
    // 允许0.001度的误差（大约100米）
    return latDiff < 0.001 && lngDiff < 0.001;
  };

  // 生成无人机飞行路径
  const generateFlightPath = (start, end) => {
    // 生成从起点到终点的路径点
    const path = [];
    const steps = 20; // 路径点数量
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const lat = start[1] + (end[1] - start[1]) * progress;
      const lng = start[0] + (end[0] - start[0]) * progress;
      path.push([lng, lat]);
    }
    
    return path;
  };

  // 开始模拟
  const startSimulation = () => {
    console.log('开始模拟，当前订单数量:', orders.length);
    setIsSimulationRunning(true);
    
    // 为所有待分配的订单分配无人机
    orders.forEach(order => {
      if (order.status === 'pending') {
        console.log('为订单分配无人机:', order.id);
        assignDroneToOrder(order);
      }
    });
  };

  // 停止模拟
  const stopSimulation = () => {
    setIsSimulationRunning(false);
  };

  // 重置系统
  const resetSystem = () => {
    setOrders([]);
    setDrones([]);
    setSelectedOrder(null);
    setIsSimulationRunning(false);
  };

  // 更新无人机位置（模拟飞行）
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      console.log('更新无人机位置，当前无人机数量:', drones.length, '当前倍速:', simulationSpeed);
      
      setDrones(prev => 
        prev.map(drone => {
          console.log('处理无人机:', drone.id, '状态:', drone.status, '路径长度:', drone.path?.length);
          
          if (drone.status === 'assigned') {
            // 开始配送
            console.log('无人机开始配送:', drone.id);
            return { ...drone, status: 'delivering' };
          } else if (drone.status === 'delivering' && drone.path && drone.path.length > 0) {
            // 更新无人机位置 - 沿着路径逐步移动
            const nextIndex = Math.min((drone.pathIndex || 0) + 1, drone.path.length - 1);
            const newStatus = nextIndex >= drone.path.length - 1 ? 'completed' : 'delivering';
            
            console.log('无人机位置更新:', drone.id, '从索引', drone.pathIndex, '到', nextIndex, '新状态:', newStatus);
            
            // 如果完成，更新订单状态
            if (newStatus === 'completed') {
              setOrders(prev => 
                prev.map(o => 
                  o.id === drone.orderId ? { ...o, status: 'completed' } : o
                )
              );
            }
            
            return {
              ...drone,
              currentPosition: drone.path[nextIndex],
              pathIndex: nextIndex,
              status: newStatus
            };
          }
          return drone;
        })
      );
    }, getUpdateInterval()); // 使用动态更新间隔

    return () => clearInterval(interval);
  }, [isSimulationRunning, simulationSpeed]);

  return (
    <div className="App">
      <div className="header">
        <h1>清华大学无人机外卖实时调度系统</h1>
        <div className="header-controls">
          {!isSimulationRunning ? (
            <button onClick={startSimulation} className="start-btn">
              🚀 开始模拟
            </button>
          ) : (
            <button onClick={stopSimulation} className="stop-btn">
              ⏹️ 停止模拟
            </button>
          )}
          <button onClick={resetSystem} className="reset-btn">
            🔄 重置系统
          </button>
          
          {/* 倍速控制 */}
          <div className="speed-controls">
            <span className="speed-label">倍速:</span>
            <div className="speed-buttons">
              {speedOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSimulationSpeed(option.value)}
                  className={`speed-btn ${simulationSpeed === option.value ? 'active' : ''}`}
                  title={`${option.label} 速度`}
                >
                  {option.icon} {option.label}
                </button>
              ))}
            </div>
            <span className="current-speed">{getCurrentSpeedText()}</span>
          </div>
        </div>
      </div>
      
      <div className="main-content">
        <div className="left-panel">

          
          <OrderPanel 
            onAddOrder={addOrder}
            orders={orders}
            onSelectOrder={setSelectedOrder}
            selectedOrder={selectedOrder}
            locations={locations}
            isSimulationRunning={isSimulationRunning}
          />
          <DroneStatus drones={drones} />
        </div>
        
        <div className="map-container">
          <Map 
            orders={orders}
            drones={drones}
            routes={routes}
            selectedOrder={selectedOrder}
            locations={locations}
          />
        </div>
      </div>
    </div>
  );
}

export default App; 