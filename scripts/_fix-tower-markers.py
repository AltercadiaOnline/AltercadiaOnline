import json
import os
import re

floors = [
  'andar_1_torre_poder',
  'andar_2_torre_poder',
  'andar_3_torre_poder',
  'andar_4_torre_poder2',
  'andar_5_torre_poder3',
]
base = 'construct-editor/layouts'
for name in floors:
  path = os.path.join(base, name + '.json')
  with open(path, encoding='utf-8') as f:
    data = json.load(f)
  layers = data.get('layers') or []
  changed = 0
  for layer in layers:
    for inst in layer.get('instances') or []:
      t = inst.get('type')
      world = inst.get('world')
      if not world:
        continue
      if t == 'next_level_power_tower':
        world['x'] = 560
        world['y'] = 320
        world['originX'] = 0.5
        world['originY'] = 0.5
        world['width'] = 96
        world['height'] = 96
        changed += 1
      if t == 'leave_level_power_tower2':
        world['x'] = 320
        world['y'] = 560
        world['originX'] = 0.5
        world['originY'] = 0.5
        world['width'] = 96
        world['height'] = 96
        changed += 1
  with open(path, 'w', encoding='utf-8', newline='\n') as f:
    json.dump(data, f, ensure_ascii=False, indent='\t')
    f.write('\n')
  print(name, 'fixed', changed)

gen = 'src/shared/world/constructNpcPlacements.generated.ts'
text = open(gen, encoding='utf-8').read()
text2 = re.sub(
  r"(archetypeId: 'next_level_power_tower', mapId: 'tower_floor_\d+', constructLayout: '[^']+', constructX: )-?\d+(, constructY: )-?\d+",
  lambda m: m.group(1) + '560' + m.group(2) + '320',
  text,
)
text2 = re.sub(
  r"(archetypeId: 'leave_level_power_tower2', mapId: 'tower_floor_5', constructLayout: '[^']+', constructX: )-?\d+(, constructY: )-?\d+",
  lambda m: m.group(1) + '320' + m.group(2) + '560',
  text2,
)
text2 = re.sub(
  r"(next_level_power_tower: \{ mapId: '[^']+', constructLayout: '[^']+', constructX: )-?\d+(, constructY: )-?\d+",
  lambda m: m.group(1) + '560' + m.group(2) + '320',
  text2,
)
text2 = re.sub(
  r"(leave_level_power_tower2: \{ mapId: '[^']+', constructLayout: '[^']+', constructX: )-?\d+(, constructY: )-?\d+",
  lambda m: m.group(1) + '320' + m.group(2) + '560',
  text2,
)
open(gen, 'w', encoding='utf-8', newline='\n').write(text2)
print('placements patched', text != text2)
