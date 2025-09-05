import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './OrderPanel.css';

const OrderPanel = ({ onAddOrder, orders, onSelectOrder, selectedOrder, locations, isSimulationRunning }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    startPoint: '',
    endPoint: '',
    description: ''
  });

  // 监听locations数据变化
  useEffect(() => {
    console.log('OrderPanel: locations数据更新:', locations);
    console.log('校门数量:', locations.gates?.length || 0);
    console.log('食堂数量:', locations.canteens?.length || 0);
    console.log('宿舍数量:', locations.dorms?.length || 0);
  }, [locations]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('提交表单数据:', formData);
    console.log('可用地点数据:', locations);
    console.log('校门数量:', locations.gates?.length || 0);
    console.log('食堂数量:', locations.canteens?.length || 0);
    console.log('宿舍数量:', locations.dorms?.length || 0);
    
    // 检查是否选择了起点和终点
    if (!formData.startPoint || !formData.endPoint) {
      alert('请选择起点和终点');
      return;
    }
    
    const startLocation = [...locations.gates, ...locations.canteens].find(loc => loc.id === formData.startPoint);
    const endLocation = locations.dorms.find(loc => loc.id === formData.endPoint);
    
    console.log('找到的起点:', startLocation);
    console.log('找到的终点:', endLocation);
    
    if (!startLocation || !endLocation) {
      alert('请选择有效的起点和终点');
      return;
    }

    const orderData = {
      startPoint: startLocation.coords,
      endPoint: endLocation.coords,
      startLocation: startLocation.name,
      endLocation: endLocation.name,
      description: formData.description
    };

    onAddOrder(orderData);
    setFormData({ startPoint: '', endPoint: '', description: '' });
    setShowForm(false);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#f39c12',
      'assigned': '#3498db',
      'delivering': '#9b59b6',
      'completed': '#27ae60'
    };
    return colors[status] || '#95a5a6';
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': '待分配',
      'assigned': '已分配',
      'delivering': '配送中',
      'completed': '已完成'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="order-panel">
      <div className="panel-header">
        <h3>订单管理</h3>
        <button 
          className="add-order-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '取消' : '添加订单'}
        </button>
      </div>

      {!isSimulationRunning && (
        <div className="simulation-notice">
          <p>⚠️ 请先点击"开始模拟"按钮启动配送系统</p>
        </div>
      )}



      {showForm && (
        <form className="order-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>起点位置:</label>
            <select
              name="startPoint"
              value={formData.startPoint}
              onChange={handleInputChange}
              required
            >
              <option value="">请选择起点</option>
              <optgroup label="校门">
                {locations.gates.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="食堂">
                {locations.canteens.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label>终点位置:</label>
            <select
              name="endPoint"
              value={formData.endPoint}
              onChange={handleInputChange}
              required
            >
              <option value="">请选择终点</option>
              {locations.dorms.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>订单描述:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="可选：描述订单内容"
              rows="2"
            />
          </div>

          <button type="submit" className="submit-btn">
            创建订单
          </button>
        </form>
      )}

      <div className="orders-list">
        <h4>订单列表 ({orders.length})</h4>
        {orders.length === 0 ? (
          <p className="no-orders">暂无订单</p>
        ) : (
          orders.map(order => (
            <div 
              key={order.id}
              className={`order-item ${selectedOrder?.id === order.id ? 'selected' : ''}`}
              onClick={() => onSelectOrder(order)}
            >
              <div className="order-header">
                <span className="order-number">{order.orderNumber}</span>
                <span 
                  className="order-status"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
              
              <div className="order-details">
                <div className="location-info">
                  <div className="start-location">
                    <span className="location-icon">📍</span>
                    <span className="location-text">{order.startLocation}</span>
                  </div>
                  <div className="end-location">
                    <span className="location-icon">🎯</span>
                    <span className="location-text">{order.endLocation}</span>
                  </div>
                </div>
                
                {order.description && (
                  <div className="order-description">
                    {order.description}
                  </div>
                )}
                
                <div className="order-time">
                  {format(new Date(order.createTime), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderPanel; 