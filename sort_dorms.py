import json
import re
import os

def extract_building_number(name):
    """
    从建筑名称中提取楼号
    - 紫荆学生公寓1号楼 -> 1
    - 紫荆学生公寓23号楼 -> 23
    - 1号楼 -> 1
    - 33-34号楼 -> 33
    - 10号楼北楼 -> 10
    """
    if not name:
        return 0
    
    # 匹配数字模式
    patterns = [
        r'紫荆学生公寓(\d+)号楼',  # 紫荆学生公寓1号楼
        r'(\d+)号楼',              # 1号楼
        r'(\d+)-\d+号楼',          # 33-34号楼
        r'(\d+)号楼[东南西北]',     # 10号楼北楼
    ]
    
    for pattern in patterns:
        match = re.search(pattern, name)
        if match:
            return int(match.group(1))
    
    return 0

def is_zijing_dorm(name):
    """判断是否为紫荆学生公寓"""
    return name and '紫荆学生公寓' in name

def sort_dorms(data):
    """
    对学生公寓数据进行排序
    返回排序后的features列表
    """
    features = data.get('features', [])
    
    # 分离紫荆学生公寓和其他公寓
    zijing_dorms = []
    other_dorms = []
    
    for feature in features:
        properties = feature.get('properties', {})
        name = properties.get('name', '')
        
        if is_zijing_dorm(name):
            zijing_dorms.append(feature)
        else:
            other_dorms.append(feature)
    
    # 对紫荆学生公寓按楼号排序
    zijing_dorms.sort(key=lambda x: extract_building_number(x.get('properties', {}).get('name', '')))
    
    # 对其他公寓按楼号排序
    other_dorms.sort(key=lambda x: extract_building_number(x.get('properties', {}).get('name', '')))
    
    # 合并：紫荆学生公寓在前，其他公寓在后
    sorted_features = zijing_dorms + other_dorms
    
    return sorted_features

def main():
    """主函数"""
    input_file = 'data/dorms.geojson'
    output_file = 'data/dorms_sorted.geojson'
    
    # 检查输入文件是否存在
    if not os.path.exists(input_file):
        print(f"错误：输入文件 {input_file} 不存在")
        return
    
    try:
        # 读取原始数据
        print(f"正在读取 {input_file}...")
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"成功读取数据，共 {len(data.get('features', []))} 个建筑")
        
        # 排序
        print("正在排序数据...")
        sorted_features = sort_dorms(data)
        
        # 创建新的数据结构
        sorted_data = {
            "type": data.get("type", "FeatureCollection"),
            "name": data.get("name", "dorms"),
            "crs": data.get("crs", {}),
            "features": sorted_features
        }
        
        # 保存排序后的数据
        print(f"正在保存排序后的数据到 {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(sorted_data, f, ensure_ascii=False, indent=2)
        
        print(f"排序完成！结果已保存到 {output_file}")
        
        # 显示排序结果
        print("\n排序结果预览：")
        print("=" * 50)
        
        # 显示紫荆学生公寓
        zijing_count = 0
        print("紫荆学生公寓（按楼号排序）：")
        for feature in sorted_features:
            name = feature.get('properties', {}).get('name', '')
            if is_zijing_dorm(name):
                print(f"  {name}")
                zijing_count += 1
        
        print(f"\n共 {zijing_count} 个紫荆学生公寓")
        print("-" * 50)
        
        # 显示其他公寓
        other_count = 0
        print("其他公寓（按楼号排序）：")
        for feature in sorted_features:
            name = feature.get('properties', {}).get('name', '')
            if not is_zijing_dorm(name):
                print(f"  {name}")
                other_count += 1
        
        print(f"\n共 {other_count} 个其他公寓")
        print("=" * 50)
        
    except FileNotFoundError:
        print(f"错误：找不到文件 {input_file}")
    except json.JSONDecodeError as e:
        print(f"错误：JSON 格式错误 - {e}")
    except Exception as e:
        print(f"错误：{e}")

if __name__ == "__main__":
    main() 