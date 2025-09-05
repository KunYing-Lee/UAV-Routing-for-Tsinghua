import React from 'react';
import './DroneStatus.css';

const DroneStatus = ({ drones }) => {
  const getStatusColor = (status) => {
    const colors = {
      'assigned': '#3498db',
      'delivering': '#9b59b6',
      'completed': '#27ae60'
    };
    return colors[status] || '#95a5a6';
  };

  const getStatusText = (status) => {
    const statusMap = {
      'assigned': '已分配',
      'delivering': '飞行中',
      'completed': '已完成'
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      'assigned': '🚁',
      'delivering': '✈️',
      'completed': '✅'
    };
    return icons[status] || '🚁';
  };

  const getAltitudeColor = (altitude) => {
    if (altitude <= 100) return '#27ae60';
    if (altitude <= 150) return '#f39c12';
    return '#e74c3c';
  };

  // 计算无人机航线完成进度
  const calculateFlightProgress = (drone) => {
    if (!drone.path || drone.path.length === 0) {
      return 0;
    }

    if (drone.status === 'completed') {
      return 100;
    }

    if (drone.status === 'assigned') {
      return 0;
    }

    // 计算当前进度
    if (drone.status === 'delivering' && drone.pathIndex !== undefined) {
      const totalPoints = drone.path.length;
      const currentPoint = drone.pathIndex;
      
      if (totalPoints > 1) {
        // 计算百分比进度
        const progress = (currentPoint / (totalPoints - 1)) * 100;
        return Math.min(Math.max(progress, 0), 100);
      }
    }

    return 0;
  };

  // 获取进度条颜色
  const getProgressColor = (progress) => {
    if (progress < 30) return '#e74c3c';      // 红色 - 刚开始
    if (progress < 70) return '#f39c12';      // 橙色 - 进行中
    if (progress < 100) return '#3498db';     // 蓝色 - 接近完成
    return '#27ae60';                         // 绿色 - 完成
  };

  // 格式化进度显示
  const formatProgress = (progress) => {
    return `${Math.round(progress)}%`;
  };

  return (
    <div className="drone-status">
      <div className="status-header">
        <h3>无人机状态</h3>
        <span className="drone-count">{drones.length} 架</span>
      </div>

      {drones.length === 0 ? (
        <div className="no-drones">
          <p>暂无无人机活动</p>
          <span className="drone-icon">🚁</span>
        </div>
      ) : (
        <div className="drones-list">
          {drones.map(drone => {
            const flightProgress = calculateFlightProgress(drone);
            const progressColor = getProgressColor(flightProgress);
            
            return (
              <div key={drone.id} className="drone-item">
                <div className="drone-header">
                  <span className="drone-id">{drone.id}</span>
                  <span 
                    className="drone-status-badge"
                    style={{ backgroundColor: getStatusColor(drone.status) }}
                  >
                    {getStatusIcon(drone.status)} {getStatusText(drone.status)}
                  </span>
                </div>

                <div className="drone-info">
                  <div className="info-row">
                    <span className="info-label">订单ID:</span>
                    <span className="info-value">{drone.orderId}</span>
                  </div>
                  
                  <div className="info-row">
                    <span className="info-label">高度:</span>
                    <span 
                      className="info-value altitude"
                      style={{ color: getAltitudeColor(drone.altitude) }}
                    >
                      {drone.altitude}m
                    </span>
                  </div>
                  
                  <div className="info-row">
                    <span className="info-label">速度:</span>
                    <span className="info-value">{drone.speed}m/s</span>
                  </div>
                </div>

                {drone.path && drone.path.length > 0 && (
                  <div className="path-info">
                    <div className="path-progress">
                      <div className="progress-header">
                        <span className="progress-label">飞行进度:</span>
                        <span className="progress-value">{formatProgress(flightProgress)}</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${flightProgress}%`,
                            backgroundColor: progressColor
                          }}
                        />
                      </div>
                      <div className="progress-details">
                        <span className="detail-text">
                          {drone.status === 'assigned' && '等待起飞'}
                          {drone.status === 'delivering' && `航线点 ${drone.pathIndex || 0}/${drone.path.length - 1}`}
                          {drone.status === 'completed' && '配送完成'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {drones.length > 0 && (
        <div className="status-summary">
          <div className="summary-item">
            <span className="summary-label">已分配:</span>
            <span className="summary-value">
              {drones.filter(d => d.status === 'assigned').length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">飞行中:</span>
            <span className="summary-value">
              {drones.filter(d => d.status === 'delivering').length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">已完成:</span>
            <span className="summary-value">
              {drones.filter(d => d.status === 'completed').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DroneStatus; 