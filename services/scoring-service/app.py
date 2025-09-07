from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Dict
import os, json, time
from fastapi.middleware.cors import CORSMiddleware

DATA_DIR = os.path.join(os.path.dirname(__file__), 'models')
EVENTS_FILE = os.path.join(DATA_DIR, 'events.json')
MODELS_FILE = os.path.join(DATA_DIR, 'registry.json')

os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(EVENTS_FILE): open(EVENTS_FILE, 'w').write('[]')
if not os.path.exists(MODELS_FILE): open(MODELS_FILE, 'w').write('[]')

def read_events(): return json.loads(open(EVENTS_FILE).read())
def write_events(arr): open(EVENTS_FILE,'w').write(json.dumps(arr, indent=2))
def read_models(): return json.loads(open(MODELS_FILE).read())
def write_models(arr): open(MODELS_FILE,'w').write(json.dumps(arr, indent=2))

app = FastAPI(title="Mixtli Scoring Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

class Event(BaseModel):
    id: str
    user_id: Optional[str] = None
    amount: Optional[float] = None
    features: Dict = {}
    label: Optional[bool] = None
    label_source: Optional[str] = None
    occurred_at: Optional[str] = None

@app.get('/health')
def health(): return {'status':'ok','service':'scoring-service'}

@app.post('/events')
def ingest(ev: Event):
    evd = ev.dict(); arr = read_events(); arr = [e for e in arr if e['id'] != evd['id']]; arr.append(evd); write_events(arr); return {'ok':True, 'count': len(arr)}

@app.get('/events')
def list_events(): return {'count': len(read_events()), 'items': read_events()}

@app.post('/feedback')
def feedback(payload: Dict):
    event_id = payload.get('event_id'); label = payload.get('label'); source = payload.get('source','manual')
    arr = read_events(); found = False
    for e in arr:
        if e['id'] == event_id:
            e['label'] = bool(label); e['label_source'] = source; found = True; break
    write_events(arr); return {'ok': found}

@app.post('/train')
def train():
    arr = read_events(); labeled = [e for e in arr if e.get('label') is not None and e.get('amount') is not None]
    if not labeled:
        model = {'name':'fraud-default','version':f'0.0.{int(time.time())}','uri':'local://dummy','metrics':{'note':'no labeled data'},'is_active': True}
    else:
        pos = sorted([e['amount'] for e in labeled if e['label']]); neg = sorted([e['amount'] for e in labeled if not e['label']])
        thr = ((pos[-1] if pos else 0)+(neg[0] if neg else 0))/2 if pos and neg else (pos[-1] if pos else (neg[0] if neg else 0))
        tp = sum(1 for e in labeled if (e['amount']>=thr) and e['label']); tn = sum(1 for e in labeled if (e['amount']<thr) and not e['label'])
        fp = sum(1 for e in labeled if (e['amount']>=thr) and not e['label']); fn = sum(1 for e in labeled if (e['amount']<thr) and e['label'])
        acc = (tp+tn)/max(1,len(labeled))
        model = {'name':'fraud-default','version':f'0.1.{int(time.time())}','uri':'local://amount-threshold','metrics':{'threshold':thr,'acc':acc,'tp':tp,'tn':tn,'fp':fp,'fn':fn},'is_active': True}
    reg = read_models(); 
    for m in reg:
        if m['name']==model['name']: m['is_active']=False
    reg.append(model); write_models(reg); return {'ok':True,'model':model}

@app.get('/models')
def models(): return {'items': read_models()}
