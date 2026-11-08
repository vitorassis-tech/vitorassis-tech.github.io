"""Limpa as imagens de referência do Vitor (retira as caixas de interface desenhadas) e gera os fundos do site."""
import cv2, numpy as np
from PIL import Image, ImageFilter

UP = '/mnt/user-data/uploads/'
OUT = '/home/claude/audit/site/public/img/fundos/'
SH = '/home/claude/shots/'


def inpaint(img, rects, raio=9, suave=6):
    mask = np.zeros(img.shape[:2], np.uint8)
    for x0, y0, x1, y1 in rects:
        cv2.rectangle(mask, (x0, y0), (x1, y1), 255, -1)
    fix = cv2.inpaint(img, mask, raio, cv2.INPAINT_TELEA)
    blur = cv2.GaussianBlur(fix, (0, 0), suave)
    m = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 5)[..., None]
    return (fix * (1 - m) + blur * m).astype(np.uint8)


def para_pil(bgr):
    return Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))


def salvar(im, nome, w2=2560, w1=1600):
    h2 = round(im.height * w2 / im.width)
    big = im.resize((w2, h2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
    big.save(OUT + nome + '.webp', 'WEBP', quality=84, method=6)
    big.resize((w1, round(h2 * w1 / w2)), Image.LANCZOS).save(OUT + nome + '-1600.webp', 'WEBP', quality=82, method=6)
    big.resize((1280, round(h2 * 1280 / w2))).save(SH + 'p-' + nome + '.png')
    return big


def mascara(im, cor, esq=None, base=None):
    a = np.asarray(im, dtype=np.float32)
    H, W = a.shape[:2]
    xx = np.linspace(0, 1, W)[None, :, None]
    yy = np.linspace(0, 1, H)[:, None, None]
    m = np.zeros((H, W, 1), np.float32)
    if esq:
        m = np.maximum(m, np.clip((esq[1] - xx) / (esq[1] - esq[0]), 0, 1) * esq[2])
    if base:
        m = np.maximum(m, np.clip((yy - base[0]) / (base[1] - base[0]), 0, 1) * base[2])
    return Image.fromarray((a * (1 - m) + np.array(cor, np.float32) * m).astype(np.uint8))


# 1) Abertura: versão com caminhão (8bda) -----------------------------------
src = cv2.imread(UP + '8bda1753-image.jpg')
# painel vazio da direita, barra horizontal e botões/pílulas da esquerda
src = inpaint(src, [(1188, 128, 1342, 412)])
im = para_pil(src)
a = np.asarray(im, np.float32)
H, W = a.shape[:2]
# escurece a barra desenhada (à esquerda do caminhão) com borda suave
m = np.zeros((H, W), np.float32)
m[436:522, 0:890] = 1
m = cv2.GaussianBlur(m, (0, 0), 14)[..., None] * 0.9
a = a * (1 - m) + np.array([6, 12, 24], np.float32) * m
im = Image.fromarray(a.astype(np.uint8))
im = mascara(im, (6, 12, 24), esq=(0.33, 0.44, 0.97), base=(0.66, 0.8, 0.92))
big = salvar(im, 'hero-globo')
# celular: recorte da cena (cidade, globo, avião, caminhão)
cena = big.crop((1100, 120, 2560, 1260)).resize((1080, 843), Image.LANCZOS)
mov = Image.new('RGB', (1080, 1500), (6, 12, 24)); mov.paste(cena, (0, 620))
mov.save(OUT + 'hero-globo-movel.webp', 'WEBP', quality=82, method=6)

# 2) Experiência: caminhão em estrada clara (0c4e), espelhado para o caminhão ficar à direita
im = Image.open(UP + '0c4e4846-image.jpg').convert('RGB').transpose(Image.FLIP_LEFT_RIGHT)
src = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
src = inpaint(src, [(348, 185, 360, 555), (680, 185, 692, 555)], raio=5, suave=3)  # linhas verticais soltas
salvar(para_pil(src), 'experiencia-caminhao')

# 3) Formação: capelo e diploma (71b6), sem as três caixas vazias
src = cv2.imread(UP + '71b6bf73-image.jpg')
peq = cv2.resize(src, None, fx=0.5, fy=0.5)
peq = inpaint(peq, [(368, 30, 674, 274)], raio=15, suave=12)
fix = cv2.resize(peq, (src.shape[1], src.shape[0]))
mask = np.zeros(src.shape[:2], np.float32); mask[50:560, 735:1350] = 1
mask = cv2.GaussianBlur(mask, (0, 0), 20)[..., None]
src = (src * (1 - mask) + cv2.GaussianBlur(fix, (0, 0), 10) * mask).astype(np.uint8)
salvar(para_pil(src), 'formacao-diploma')

# 4) Sobre: colagem de porto, armazém e caminhão (be47), sem a barra inferior e sem as caixas de vidro
src = cv2.imread(UP + 'be471fff-image.jpg')[0:530]
salvar(para_pil(src), 'sobre-colagem')
print('ok')
