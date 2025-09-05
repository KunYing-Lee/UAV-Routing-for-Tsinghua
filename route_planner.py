import json
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.colors import LinearSegmentedColormap
from shapely.geometry import Point, Polygon, LineString
from shapely.ops import unary_union
import heapq
import math
from typing import List, Tuple, Dict, Set
import warnings
warnings.filterwarnings('ignore')

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

class DroneRoutePlanner:
    def __init__(self, data_dir="data"):
        """初始化航线规划器"""
        self.data_dir = data_dir
        self.gates = []
        self.canteens = []
        self.dorms = []
        self.buildings = []
        self.sports = []
        self.roads = []
        self.campus_boundary = None
        
        self.load_data()
        
        self.grid_size = 0.0001
        self.bounds = self.calculate_bounds()
        self.grid_width = int((self.bounds[1] - self.bounds[0]) / self.grid_size) + 1
        self.grid_height = int((self.bounds[3] - self.bounds[2]) / self.grid_size) + 1
        
        # 创建障碍物网格
        self.obstacle_grid = self.create_obstacle_grid()
        
        # 航线高度分层
        self.height_levels = {
            'low': 50,    
            'medium': 75, 
            'high': 100   
        }
        
    def load_data(self):
        """加载所有GeoJSON数据"""
        print("正在加载数据...")
        
        # 加载校门
        with open(f"{self.data_dir}/gates.geojson", 'r', encoding='utf-8') as f:
            gates_data = json.load(f)
            for feature in gates_data['features']:
                coords = feature['geometry']['coordinates']
                self.gates.append({
                    'name': f"校门{len(self.gates)+1}",
                    'coordinates': coords
                })
        
        # 加载食堂
        with open(f"{self.data_dir}/canteens.geojson", 'r', encoding='utf-8') as f:
            canteens_data = json.load(f)
            for feature in canteens_data['features']:
                if feature['geometry']['type'] == 'Polygon':
                    coords = feature['geometry']['coordinates'][0]
                    center = self.calculate_polygon_center(coords)
                    name = feature['properties'].get('name', f"食堂{len(self.canteens)+1}")
                    self.canteens.append({
                        'name': name,
                        'coordinates': center,
                        'polygon': coords
                    })
        
        # 加载宿舍
        with open(f"{self.data_dir}/dorms.geojson", 'r', encoding='utf-8') as f:
            dorms_data = json.load(f)
            for feature in dorms_data['features']:
                if feature['geometry']['type'] == 'Polygon':
                    coords = feature['geometry']['coordinates'][0]
                    center = self.calculate_polygon_center(coords)
                    name = feature['properties'].get('name', f"宿舍{len(self.dorms)+1}")
                    self.dorms.append({
                        'name': name,
                        'coordinates': center,
                        'polygon': coords
                    })
        
        # 加载建筑
        with open(f"{self.data_dir}/buildings.geojson", 'r', encoding='utf-8') as f:
            buildings_data = json.load(f)
            for feature in buildings_data['features']:
                if feature['geometry']['type'] == 'Polygon':
                    coords = feature['geometry']['coordinates'][0]
                    self.buildings.append(coords)
        
        # 加载运动场所
        with open(f"{self.data_dir}/sports.geojson", 'r', encoding='utf-8') as f:
            sports_data = json.load(f)
            for feature in sports_data['features']:
                if feature['geometry']['type'] == 'Polygon':
                    coords = feature['geometry']['coordinates'][0]
                    name = feature['properties'].get('name', f"运动场所{len(self.sports)+1}")
                    self.sports.append({
                        'name': name,
                        'polygon': coords
                    })
        
        # 加载校园边界
        with open(f"{self.data_dir}/campus_boundary.geojson", 'r', encoding='utf-8') as f:
            boundary_data = json.load(f)
            if boundary_data['features']:
                coords = boundary_data['features'][0]['geometry']['coordinates'][0]
                self.campus_boundary = coords
        
        print(f"数据加载完成: {len(self.gates)}个校门, {len(self.canteens)}个食堂, {len(self.dorms)}个宿舍")
    
    def calculate_polygon_center(self, coords):
        """计算多边形中心点"""
        x_coords = [coord[0] for coord in coords]
        y_coords = [coord[1] for coord in coords]
        return [np.mean(x_coords), np.mean(y_coords)]
    
    def calculate_bounds(self):
        """计算校园边界"""
        all_coords = []
        
        # 收集所有坐标
        for gate in self.gates:
            all_coords.append(gate['coordinates'])
        for canteen in self.canteens:
            all_coords.append(canteen['coordinates'])
        for dorm in self.dorms:
            all_coords.append(dorm['coordinates'])
        
        if self.campus_boundary:
            all_coords.extend(self.campus_boundary)
        
        if not all_coords:
            return [116.3, 116.34, 39.99, 40.02]  # 默认边界
        
        x_coords = [coord[0] for coord in all_coords]
        y_coords = [coord[1] for coord in all_coords]
        
        return [
            min(x_coords) - 0.001,
            max(x_coords) + 0.001,
            min(y_coords) - 0.001,
            max(y_coords) + 0.001
        ]
    
    def coord_to_grid(self, coord):
        """将坐标转换为网格索引"""
        x = int((coord[0] - self.bounds[0]) / self.grid_size)
        y = int((coord[1] - self.bounds[2]) / self.grid_size)
        return max(0, min(x, self.grid_width - 1)), max(0, min(y, self.grid_height - 1))
    
    def grid_to_coord(self, grid_pos):
        """将网格索引转换为坐标"""
        x = self.bounds[0] + grid_pos[0] * self.grid_size
        y = self.bounds[2] + grid_pos[1] * self.grid_size
        return [x, y]
    
    def point_in_polygon(self, point, polygon):
        """判断点是否在多边形内"""
        x, y = point
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
    
    def create_obstacle_grid(self):
        """创建障碍物网格"""
        print("正在创建障碍物网格...")
        grid = np.zeros((self.grid_height, self.grid_width), dtype=bool)
        
        # 标记建筑为障碍物
        print("标记建筑为障碍物...")
        for building in self.buildings:
            for i in range(self.grid_height):
                for j in range(self.grid_width):
                    coord = self.grid_to_coord([j, i])
                    if self.point_in_polygon(coord, building):
                        grid[i, j] = True
        
        # 标记运动场所为障碍物（增加缓冲区）
        print("标记运动场所为障碍物...")
        buffer_distance = 0.0005  # 约50米的缓冲区
        
        for sport in self.sports:
            sport_polygon = sport['polygon']
            
            # 标记运动场所及其周围区域为障碍物
            for i in range(self.grid_height):
                for j in range(self.grid_width):
                    coord = self.grid_to_coord([j, i])
                    
                    # 检查是否在运动场所内
                    if self.point_in_polygon(coord, sport_polygon):
                        grid[i, j] = True
                        continue
                    
                    # 检查是否在缓冲区范围内
                    for point in sport_polygon:
                        distance = math.sqrt((coord[0] - point[0])**2 + (coord[1] - point[1])**2)
                        if distance <= buffer_distance:
                            grid[i, j] = True
                            break
        
        print(f"障碍物网格创建完成: {np.sum(grid)}个障碍物点")
        return grid
    
    def heuristic(self, a, b):
        """A*算法的启发式函数（曼哈顿距离）"""
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    def get_neighbors(self, node):
        """获取节点的邻居"""
        x, y = node
        neighbors = []
        
        # 8个方向的邻居
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                
                new_x, new_y = x + dx, y + dy
                
                # 检查边界
                if 0 <= new_x < self.grid_width and 0 <= new_y < self.grid_height:
                    # 检查是否为障碍物
                    if not self.obstacle_grid[new_y, new_x]:
                        neighbors.append((new_x, new_y))
        
        return neighbors
    
    def a_star(self, start, goal):
        """A*算法实现"""
        start_grid = self.coord_to_grid(start)
        goal_grid = self.coord_to_grid(goal)
        
        # 如果起点或终点在障碍物内，尝试找到最近的可通行点
        if self.obstacle_grid[start_grid[1], start_grid[0]]:
            start_grid = self.find_nearest_free_point(start_grid)
            if start_grid is None:
                return None
        
        if self.obstacle_grid[goal_grid[1], goal_grid[0]]:
            goal_grid = self.find_nearest_free_point(goal_grid)
            if goal_grid is None:
                return None
        
        open_set = []
        heapq.heappush(open_set, (0, start_grid))
        came_from = {}
        g_score = {start_grid: 0}
        f_score = {start_grid: self.heuristic(start_grid, goal_grid)}
        closed_set = set()
        
        while open_set:
            current = heapq.heappop(open_set)[1]
            
            if current == goal_grid:
                # 重建路径
                path = []
                while current in came_from:
                    path.append(self.grid_to_coord(current))
                    current = came_from[current]
                path.append(self.grid_to_coord(start_grid))
                path.reverse()
                return path
            
            closed_set.add(current)
            
            for neighbor in self.get_neighbors(current):
                if neighbor in closed_set:
                    continue
                
                tentative_g_score = g_score[current] + 1
                
                if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    f_score[neighbor] = g_score[neighbor] + self.heuristic(neighbor, goal_grid)
                    
                    if neighbor not in [item[1] for item in open_set]:
                        heapq.heappush(open_set, (f_score[neighbor], neighbor))
        
        # 如果A*算法失败，尝试使用更宽松的障碍物检测
        return self.a_star_relaxed(start, goal)
    
    def find_nearest_free_point(self, grid_pos):
        """找到最近的可通行点"""
        for radius in range(1, 10):  # 搜索半径
            for dx in range(-radius, radius + 1):
                for dy in range(-radius, radius + 1):
                    new_x = grid_pos[0] + dx
                    new_y = grid_pos[1] + dy
                    
                    if (0 <= new_x < self.grid_width and 
                        0 <= new_y < self.grid_height and 
                        not self.obstacle_grid[new_y, new_x]):
                        return (new_x, new_y)
        return None
    
    def a_star_relaxed(self, start, goal):
        """使用更宽松的障碍物检测的A*算法"""
        start_grid = self.coord_to_grid(start)
        goal_grid = self.coord_to_grid(goal)
        
        # 如果起点或终点在障碍物内，尝试找到最近的可通行点
        if self.obstacle_grid[start_grid[1], start_grid[0]]:
            start_grid = self.find_nearest_free_point(start_grid)
            if start_grid is None:
                return None
        
        if self.obstacle_grid[goal_grid[1], goal_grid[0]]:
            goal_grid = self.find_nearest_free_point(goal_grid)
            if goal_grid is None:
                return None
        
        open_set = []
        heapq.heappush(open_set, (0, start_grid))
        came_from = {}
        g_score = {start_grid: 0}
        f_score = {start_grid: self.heuristic(start_grid, goal_grid)}
        closed_set = set()
        
        while open_set:
            current = heapq.heappop(open_set)[1]
            
            if current == goal_grid:
                # 重建路径
                path = []
                while current in came_from:
                    path.append(self.grid_to_coord(current))
                    current = came_from[current]
                path.append(self.grid_to_coord(start_grid))
                path.reverse()
                return path
            
            closed_set.add(current)
            
            for neighbor in self.get_neighbors_relaxed(current):
                if neighbor in closed_set:
                    continue
                
                tentative_g_score = g_score[current] + 1
                
                if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    f_score[neighbor] = g_score[neighbor] + self.heuristic(neighbor, goal_grid)
                    
                    if neighbor not in [item[1] for item in open_set]:
                        heapq.heappush(open_set, (f_score[neighbor], neighbor))
        
        # 如果仍然失败，返回直线路径
        return self.create_straight_path(start, goal)
    
    def get_neighbors_relaxed(self, node):
        """获取节点的邻居（宽松版本，使用更简单的障碍物检测）"""
        x, y = node
        neighbors = []
        
        # 8个方向的邻居
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                
                new_x, new_y = x + dx, y + dy
                
                # 检查边界
                if 0 <= new_x < self.grid_width and 0 <= new_y < self.grid_height:
                    # 宽松的障碍物检测：避开建筑和运动场所
                    if not self.is_major_obstacle(new_x, new_y):
                        neighbors.append((new_x, new_y))
        
        return neighbors
    
    def is_major_obstacle(self, x, y):
        """检查是否为主要障碍物（避开建筑和运动场所）"""
        coord = self.grid_to_coord([x, y])
        
        # 检查建筑
        for building in self.buildings:
            if self.point_in_polygon(coord, building):
                return True
        
        # 检查运动场所
        for sport in self.sports:
            if self.point_in_polygon(coord, sport['polygon']):
                return True
        
        return False
    
    def create_straight_path(self, start, goal):
        """创建直线路径（最后备选方案）"""
        # 简单的直线插值
        steps = 50  # 路径点数
        path = []
        for i in range(steps + 1):
            t = i / steps
            x = start[0] + t * (goal[0] - start[0])
            y = start[1] + t * (goal[1] - start[1])
            path.append([x, y])
        return path
    
    def plan_routes(self):
        """规划所有航线"""
        print("正在规划航线...")
        
        routes = {
            'canteen_to_dorm': [],
            'gate_to_dorm': []
        }
        
        # 规划食堂到宿舍的航线
        print("规划食堂到宿舍的航线...")
        canteen_count = 0
        for canteen in self.canteens:
            for dorm in self.dorms:
                route = self.a_star(canteen['coordinates'], dorm['coordinates'])
                if route:
                    routes['canteen_to_dorm'].append({
                        'from': canteen['name'],
                        'to': dorm['name'],
                        'path': route,
                        'height': self.height_levels['medium']
                    })
                    canteen_count += 1
                    if canteen_count % 100 == 0:
                        print(f"已规划 {canteen_count} 条食堂-宿舍航线...")
        
        # 规划校门到宿舍的航线
        print("规划校门到宿舍的航线...")
        gate_count = 0
        for gate in self.gates:
            for dorm in self.dorms:
                route = self.a_star(gate['coordinates'], dorm['coordinates'])
                if route:
                    routes['gate_to_dorm'].append({
                        'from': gate['name'],
                        'to': dorm['name'],
                        'path': route,
                        'height': self.height_levels['high']
                    })
                    gate_count += 1
                    if gate_count % 50 == 0:
                        print(f"已规划 {gate_count} 条校门-宿舍航线...")
        
        print(f"航线规划完成: {len(routes['canteen_to_dorm'])}条食堂-宿舍航线, {len(routes['gate_to_dorm'])}条校门-宿舍航线")
        return routes
    
    def visualize_routes(self, routes):
        """可视化航线"""
        print("正在生成可视化...")
        
        fig, ax = plt.subplots(1, 1, figsize=(15, 12))
        
        total_steps = 4 + len(self.buildings) + len(self.sports) + len(routes['canteen_to_dorm']) + len(routes['gate_to_dorm'])
        current_step = 0
        
        # 绘制校园边界
        if self.campus_boundary:
            boundary_x = [coord[0] for coord in self.campus_boundary]
            boundary_y = [coord[1] for coord in self.campus_boundary]
            ax.plot(boundary_x, boundary_y, 'k-', linewidth=2, label='校园边界')
            current_step += 1
            print(f"可视化进度: {current_step}/{total_steps} - 绘制校园边界")
        
        # 绘制建筑
        print("正在绘制建筑...")
        for i, building in enumerate(self.buildings):  # 绘制所有建筑
            building_x = [coord[0] for coord in building]
            building_y = [coord[1] for coord in building]
            ax.fill(building_x, building_y, color='gray', alpha=0.3)
            current_step += 1
            if i % 50 == 0 or i == len(self.buildings) - 1:  # 每50个建筑显示一次进度
                print(f"可视化进度: {current_step}/{total_steps} - 绘制建筑 ({i+1}/{len(self.buildings)})")
        
        # 绘制运动场所
        print("正在绘制运动场所...")
        for i, sport in enumerate(self.sports):
            sport_x = [coord[0] for coord in sport['polygon']]
            sport_y = [coord[1] for coord in sport['polygon']]
            ax.fill(sport_x, sport_y, color='red', alpha=0.3, label='运动场所' if sport == self.sports[0] else "")
            current_step += 1
            print(f"可视化进度: {current_step}/{total_steps} - 绘制运动场所 ({i+1}/{len(self.sports)})")
        
        # 绘制校门
        gate_x = [gate['coordinates'][0] for gate in self.gates]
        gate_y = [gate['coordinates'][1] for gate in self.gates]
        ax.scatter(gate_x, gate_y, c='blue', s=100, marker='s', label='校门', zorder=5)
        current_step += 1
        print(f"可视化进度: {current_step}/{total_steps} - 绘制校门")
        
        # 绘制食堂
        canteen_x = [canteen['coordinates'][0] for canteen in self.canteens]
        canteen_y = [canteen['coordinates'][1] for canteen in self.canteens]
        ax.scatter(canteen_x, canteen_y, c='orange', s=100, marker='^', label='食堂', zorder=5)
        current_step += 1
        print(f"可视化进度: {current_step}/{total_steps} - 绘制食堂")
        
        # 绘制宿舍
        dorm_x = [dorm['coordinates'][0] for dorm in self.dorms]
        dorm_y = [dorm['coordinates'][1] for dorm in self.dorms]
        ax.scatter(dorm_x, dorm_y, c='green', s=100, marker='o', label='宿舍', zorder=5)
        current_step += 1
        print(f"可视化进度: {current_step}/{total_steps} - 绘制宿舍")
        
        # 绘制食堂到宿舍的航线
        print("正在绘制食堂到宿舍的航线...")
        for i, route in enumerate(routes['canteen_to_dorm']):
            path_x = [coord[0] for coord in route['path']]
            path_y = [coord[1] for coord in route['path']]
            ax.plot(path_x, path_y, 'b-', linewidth=1, alpha=0.6, label='食堂-宿舍航线' if route == routes['canteen_to_dorm'][0] else "")
            current_step += 1
            if i % 100 == 0 or i == len(routes['canteen_to_dorm']) - 1:  # 每100条航线显示一次进度
                print(f"可视化进度: {current_step}/{total_steps} - 绘制食堂-宿舍航线 ({i+1}/{len(routes['canteen_to_dorm'])})")
        
        # 绘制校门到宿舍的航线
        print("正在绘制校门到宿舍的航线...")
        for i, route in enumerate(routes['gate_to_dorm']):
            path_x = [coord[0] for coord in route['path']]
            path_y = [coord[1] for coord in route['path']]
            ax.plot(path_x, path_y, 'r-', linewidth=1, alpha=0.6, label='校门-宿舍航线' if route == routes['gate_to_dorm'][0] else "")
            current_step += 1
            if i % 50 == 0 or i == len(routes['gate_to_dorm']) - 1:  # 每50条航线显示一次进度
                print(f"可视化进度: {current_step}/{total_steps} - 绘制校门-宿舍航线 ({i+1}/{len(routes['gate_to_dorm'])})")
        
        
        ax.set_xlabel('经度')
        ax.set_ylabel('纬度')
        ax.set_title('清华大学无人机外卖航线规划图')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # 设置坐标轴范围
        ax.set_xlim(self.bounds[0], self.bounds[1])
        ax.set_ylim(self.bounds[2], self.bounds[3])
        
        plt.tight_layout()
        plt.savefig('drone_delivery_routes.png', dpi=300, bbox_inches='tight')
        print("可视化图像已保存到 drone_delivery_routes.png")
        plt.close()  # 关闭图形，释放内存
        
        return fig
    
    def analyze_routes(self, routes):
        """分析航线"""
        print("\n=== 航线分析报告 ===")
        
        # 统计信息
        total_canteen_routes = len(routes['canteen_to_dorm'])
        total_gate_routes = len(routes['gate_to_dorm'])
        total_routes = total_canteen_routes + total_gate_routes
        
        print(f"总航线数: {total_routes}")
        print(f"食堂-宿舍航线: {total_canteen_routes}")
        print(f"校门-宿舍航线: {total_gate_routes}")
        
        # 航线长度统计
        canteen_lengths = []
        gate_lengths = []
        
        for route in routes['canteen_to_dorm']:
            length = self.calculate_route_length(route['path'])
            canteen_lengths.append(length)
        
        for route in routes['gate_to_dorm']:
            length = self.calculate_route_length(route['path'])
            gate_lengths.append(length)
        
        if canteen_lengths:
            print(f"\n食堂-宿舍航线长度统计:")
            print(f"  平均长度: {np.mean(canteen_lengths):.2f} km")
            print(f"  最短长度: {np.min(canteen_lengths):.2f} km")
            print(f"  最长长度: {np.max(canteen_lengths):.2f} km")
        
        if gate_lengths:
            print(f"\n校门-宿舍航线长度统计:")
            print(f"  平均长度: {np.mean(gate_lengths):.2f} km")
            print(f"  最短长度: {np.min(gate_lengths):.2f} km")
            print(f"  最长长度: {np.max(gate_lengths):.2f} km")
    
    def calculate_route_length(self, path):
        """计算航线长度（公里）"""
        total_length = 0
        for i in range(len(path) - 1):
            # 使用球面距离公式
            lat1, lon1 = path[i][1], path[i][0]
            lat2, lon2 = path[i+1][1], path[i+1][0]
            
            # 简化的距离计算（适用于小范围）
            dx = (lon2 - lon1) * 111.32 * math.cos(math.radians((lat1 + lat2) / 2))
            dy = (lat2 - lat1) * 111.32
            distance = math.sqrt(dx*dx + dy*dy)
            total_length += distance
        
        return total_length

def main():
    """主函数"""
    try:
        print("清华大学无人机外卖航线规划系统")
        print("=" * 50)
        
        # 创建规划器
        planner = DroneRoutePlanner()
        
        # 规划航线
        routes = planner.plan_routes()
        
        # 可视化
        planner.visualize_routes(routes)
        
        # 分析航线
        planner.analyze_routes(routes)
        
        # 保存结果
        results = {
            'routes': routes,
            'statistics': {
                'total_canteen_routes': len(routes['canteen_to_dorm']),
                'total_gate_routes': len(routes['gate_to_dorm'])
            }
        }
        
        with open('route_planning_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print("\n结果已保存到 route_planning_results.json")
        print("可视化图已保存到 drone_delivery_routes.png")
    except Exception as e:
        print(f"程序运行出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 