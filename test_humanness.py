#!/usr/bin/env python
import requests
from pathlib import Path

midi_path = Path(__file__).parent / 'midi_examples' / 'suno 1.mid'

with open(midi_path, 'rb') as f:
    files = {'midi_file': ('suno 1.mid', f, 'audio/midi')}
    response = requests.post('http://127.0.0.1:8010/api/analyze', files=files)

if response.status_code == 200:
    data = response.json()
    dyn = data.get('dynamics', {})
    
    print("\n✅ API Response:")
    print(f"  File: {data.get('file')}")
    print(f"  Key: {data.get('key', {}).get('tonic')} {data.get('key', {}).get('mode')}")
    print(f"  Tempo: {data.get('tempo', {}).get('avg_bpm'):.0f} BPM")
    print(f"\nDynamics:")
    print(f"  Overall Dynamic: {dyn.get('overall_dynamic')}")
    print(f"  Average Velocity: {dyn.get('average_velocity')}")
    print(f"  Velocity Range: {dyn.get('min_velocity')} – {dyn.get('max_velocity')}")
    print(f"  Std Deviation: {dyn.get('std_deviation')}")
    print(f"  🎯 Humanness Score: {dyn.get('humanness_score')}%")
else:
    print(f"❌ Error: {response.text[:200]}")
