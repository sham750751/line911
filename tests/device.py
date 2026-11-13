"""Check the released binary and a real Android Storage Access Framework migration."""
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

def adb(*args):
    return subprocess.check_output(['adb', *args],text=True).strip()

def wait_node(text, tap=False):
    deadline=time.monotonic()+35
    last=[]
    while time.monotonic()<deadline:
        try:
            adb('shell','uiautomator','dump','/sdcard/sar.xml')
            nodes=ET.fromstring(adb('shell','cat','/sdcard/sar.xml')).findall('.//node')
            last=[n.get('text') or n.get('content-desc') for n in nodes]
            for n,t in zip(nodes,last):
                if (t or '').casefold() not in {text.casefold(),text.removesuffix('.json').casefold()}: continue
                if tap:
                    x,y,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
                    if x2<=x or y2<=y: continue
                    print('Tap',t,(x,y,x2,y2),flush=True)
                    adb('shell','input','tap',str((x+x2)//2),str((y+y2)//2))
                    time.sleep(.65)
                return
        except (ET.ParseError,subprocess.CalledProcessError): pass
        time.sleep(.4)
    raise AssertionError((text,[t for t in last if t]))

def launch(package):
    adb('shell','am','start','-W','-n',package+'/ru.sarexpo.ledger.MainActivity')

def export():
    wait_node('Демобаза',True)
    wait_node('Сохранить копию в файл',True)
    wait_node('SAVE',True)

def backup_names():
    return set(n for n in adb('shell','ls','-1','/sdcard/Download').splitlines() if n.endswith('.json'))

def new_backup(old):
    for _ in range(15):
        names=backup_names()-old
        if len(names)==1: return next(iter(names))
        time.sleep(.5)
    raise AssertionError('System picker did not create a backup in Downloads')

adb('shell','wm','size','1080x2400')
adb('shell','wm','density','300')
adb('shell','input','keyevent','KEYCODE_WAKEUP')
adb('shell','wm','dismiss-keyguard')
adb('install','-r','/tmp/legacy.apk')
adb('install','-r','dist/Sar-Expo-74.apk')
launch('ru.sarexpo.ledger')
wait_node('Моя база',True)
wait_node('Открыть демобазу',True)
before=backup_names()
export()
first=new_backup(before)
adb('pull','/sdcard/Download/'+first,'/tmp/sar-old.json')
legacy=json.loads(Path('/tmp/sar-old.json').read_text())
assert len(legacy['events'])==5
launch('ru.sarexpo.trade')
wait_node('Моя база',True)
wait_node('Открыть демобазу',True)
wait_node('Демобаза',True)
wait_node('Восстановить из файла',True)
wait_node(first,True)
wait_node('Заменить записи',True)
wait_node('Обзор')
adb('shell','am','force-stop','ru.sarexpo.trade')
launch('ru.sarexpo.trade')
before=backup_names()
export()
second=new_backup(before)
adb('pull','/sdcard/Download/'+second,'/tmp/sar-new.json')
assert json.loads(Path('/tmp/sar-new.json').read_text())==legacy
assert 'package:ru.sarexpo.ledger' in adb('shell','pm','list','packages','ru.sarexpo')
print('Installed both versions. All five original events survived file migration and app restart.')
