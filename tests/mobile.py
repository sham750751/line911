from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright,expect
p=Path(__file__).resolve().parents[1]/'android/assets/index.html'
with sync_playwright() as w:
 browser=w.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport=dict(width=390,height=844),is_mobile=True,has_touch=True,device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:(errors.append(str(e)), print('Page error:',e,flush=True)))
 page.on('console',lambda msg: print('Browser:',msg.text,flush=True) if msg.type=='error' else None)
 page.goto(p.as_uri())
 print('Home:',page.locator('body').inner_text()[:500],flush=True)
 def btn(s,**kw):page.get_by_role('button',name=s,exact=True,**kw).click()
 def fill(n,v):page.locator('form [name="'+n+'"]').fill(v)
 btn('Открыть демобазу')
 expect(page.get_by_role('button',name='Демобаза',exact=True)).to_be_visible()
 page.screenshot(path='/tmp/sar-home.png')
 btn('Склад');page.locator('#stockList button').filter(has_text='DDR4').click();btn('Продать')
 fill('qty','2');fill('partner','Test customer');fill('price','5000');fill('paid','1000');btn('Сохранить')
 btn('Долги');page.locator('#main button').filter(has_text='Test customer').click();fill('amount','1000');btn('Записать платёж')
 expect(page.locator('#main button').filter(has_text='Test customer')).to_contain_text('8 000')
 btn('Демобаза');btn('Открыть мою базу');btn('+ Закупка')
 fill('partner','Test supply');fill('name','Test tool');fill('qty','3');fill('price','110');fill('rate','13,1');fill('fees','99');fill('paid','30')
 btn('Сохранить закупку');expect(page.get_by_role('dialog')).not_to_be_visible()
 btn('Склад');page.locator('#stockList button').filter(has_text='Test tool').click();btn('Переместить');fill('qty','2');page.locator('[name=to]').select_option('Москва');btn('Сохранить')
 page.locator('#stockList button').click();btn('Оформить брак');page.locator('[name=from]').select_option('Москва');fill('reason','QA');btn('Сохранить')
 btn('Брак');page.locator('#main .card').click();btn('Списать товар');fill('comp','1000');btn('Подтвердить')
 btn('Долги');expect(page.locator('#main')).to_contain_text('1 000 ₽');expect(page.locator('#main')).to_contain_text('300 ¥')
 page.reload();btn('Журнал');expect(page.locator('#main')).to_contain_text('Списание');assert not errors,errors
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 print('Passed mobile purchase, transfer, sale, stock defect, compensation, payments, restart and independent data modes.')
 # Filtered warehouse must remain selected when the lot is also available elsewhere.
 btn('Склад');btn('Москва');page.locator('#stockList button').click();btn('Продать')
 expect(page.locator('[name=from]')).to_have_value('Москва')
 fill('qty','1');fill('price','2000');fill('paid','750');fill('partner','Возврат Тест');btn('Сохранить')
 btn('Журнал');page.locator('#main .card').filter(has_text='Возврат Тест').first.click();btn('Оформить возврат')
 fill('reason','Ошибка теста');expect(page.locator('#returnPreview')).to_contain_text('750 ₽');btn('Принять возврат')
 btn('Долги');page.locator('#main .card').filter(has_text='Возврат Тест').click();fill('amount','250');btn('Записать платёж')
 expect(page.locator('#main .card').filter(has_text='Возврат Тест')).to_contain_text('500 ₽')
 btn('Моя база')
 with page.expect_download() as d:btn('Сохранить копию в файл')
 import json
 backup=json.loads(Path(d.value.path()).read_text())
 assert backup['events'][-1]['side']=='refund'
 bad={**backup,'mode':'demo'}
 page.locator('#file').set_input_files({'name':'test.json','mimeType':'application/json','buffer':json.dumps(bad).encode()})
 expect(page.locator('#sheetTitle')).to_have_text('Копия не принята')
 assert page.evaluate("JSON.parse(localStorage.getItem('sar-expo-74-v1-work')).length")==len(backup['events'])
 page.locator('#file').set_input_files({'name':'test.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
 btn('Заменить записи');page.reload();btn('Долги')
 expect(page.locator('#main .card').filter(has_text='Возврат Тест')).to_contain_text('500 ₽')
 assert not errors,errors
 print('Warehouse filter, refund credit, partial payout and backup round-trip passed')
