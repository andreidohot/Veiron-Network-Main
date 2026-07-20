#!/usr/bin/env bash
# Veiron VPS Control Plane — installer interactiv
#
# Acest script NU reimplementează logica de instalare — pune întrebări,
# validează răspunsurile și apoi apelează install.sh (existent, deja
# testat) cu argumentele corecte. La final rulează health-check.sh.
#
# Rulare:  sudo ./interactive-install.sh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
INSTALL_SH="$SCRIPT_DIR/install.sh"
HEALTH_SH="$SCRIPT_DIR/health-check.sh"

# ---------- culori / helpers UI ----------
if [[ -t 1 ]]; then
  BOLD="$(tput bold)"; DIM="$(tput dim)"; RED="$(tput setaf 1)"; GREEN="$(tput setaf 2)"
  YELLOW="$(tput setaf 3)"; CYAN="$(tput setaf 6)"; RESET="$(tput sgr0)"
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

step()  { echo; echo "${BOLD}${CYAN}== $* ==${RESET}"; }
info()  { echo "${DIM}$*${RESET}"; }
ok()    { echo "${GREEN}✔ $*${RESET}"; }
warn()  { echo "${YELLOW}⚠ $*${RESET}"; }
err()   { echo "${RED}✘ $*${RESET}" >&2; }
fail()  { err "$*"; exit 1; }

ask() {
  # ask VAR "Întrebare" ["implicit"]
  local __var="$1" __prompt="$2" __default="${3:-}" __ans
  if [[ -n "$__default" ]]; then
    read -r -p "$__prompt [${__default}]: " __ans
    __ans="${__ans:-$__default}"
  else
    while true; do
      read -r -p "$__prompt: " __ans
      [[ -n "$__ans" ]] && break
      warn "Câmp obligatoriu."
    done
  fi
  printf -v "$__var" '%s' "$__ans"
}

ask_yn() {
  # ask_yn VAR "Întrebare" default(y/n)
  local __var="$1" __prompt="$2" __default="${3:-n}" __ans
  local __hint="y/N"; [[ "$__default" == "y" ]] && __hint="Y/n"
  while true; do
    read -r -p "$__prompt [$__hint]: " __ans
    __ans="${__ans:-$__default}"
    case "${__ans,,}" in
      y|yes|da) printf -v "$__var" 'true'; return ;;
      n|no|nu)  printf -v "$__var" 'false'; return ;;
      *) warn "Răspunde cu y/n." ;;
    esac
  done
}

trim() { local s="$1"; s="${s#"${s%%[![:space:]]*}"}"; s="${s%"${s##*[![:space:]]}"}"; printf '%s' "$s"; }

# ---------- precondiții ----------
[[ $EUID -eq 0 ]] || fail "Rulează cu sudo: sudo $0"
[[ -x "$INSTALL_SH" ]] || fail "Nu găsesc install.sh executabil lângă acest script ($INSTALL_SH)."
grep -qi ubuntu /etc/os-release 2>/dev/null || warn "Sistemul nu pare Ubuntu — install.sh oricum va verifica și poate eșua."

clear 2>/dev/null || true
cat <<'BANNER'
╔══════════════════════════════════════════════════════════╗
║        Veiron VPS Control Plane — instalare ghidată        ║
╚══════════════════════════════════════════════════════════╝
BANNER
info "Răspunde la câteva întrebări; la final se va rula automat instalarea,"
info "configurarea nginx, deploy-ul artefactelor și verificarea serviciilor."
echo

# ---------- 1. Bundle-ul de release ----------
step "1/8 · Pachetul de release"
default_bundle=""
for f in "$SCRIPT_DIR"/veiron-vps-control-linux-x86_64.tar.gz "$SCRIPT_DIR"/*.tar.gz; do
  [[ -f "$f" ]] && { default_bundle="$f"; break; }
done
ask BUNDLE "Cale către arhiva .tar.gz de release (bundle)" "$default_bundle"
[[ -f "$BUNDLE" ]] || fail "Nu găsesc fișierul: $BUNDLE"
ok "Bundle: $BUNDLE"

# ---------- 2. DNS / domeniu ----------
step "2/8 · DNS și domeniu (funcționează cu orice DNS/registrar)"
info "Domeniul trebuie să aibă deja un record A/AAAA care punctează la acest VPS."
ask DOMAIN "Domeniul public (ex: node1.exemplul-tau.ro)"

detected_ip="$(curl -fsS4 --max-time 4 https://ifconfig.me 2>/dev/null || true)"
resolved_ip="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || true)"
if [[ -n "$detected_ip" && -n "$resolved_ip" ]]; then
  if [[ "$detected_ip" == "$resolved_ip" ]]; then
    ok "DNS OK: $DOMAIN → $resolved_ip (se potrivește cu IP-ul acestui server)."
  else
    warn "$DOMAIN rezolvă către $resolved_ip, dar acest server pare să aibă IP-ul $detected_ip."
    warn "Certbot va eșua dacă DNS-ul nu punctează corect. Poți actualiza recordul A la orice"
    warn "furnizor DNS (Cloudflare, GoDaddy, Namecheap, propriul BIND/PowerDNS etc.)."
    ask_yn CONTINUE_DNS "Continui oricum?" "n"
    [[ "$CONTINUE_DNS" == "true" ]] || fail "Oprit — corectează DNS și rulează din nou."
  fi
elif [[ -n "$resolved_ip" ]]; then
  ok "DNS rezolvă $DOMAIN → $resolved_ip (nu am putut detecta IP-ul public local pentru comparație)."
else
  warn "Nu am putut rezolva $DOMAIN acum (poate propagarea DNS nu s-a terminat)."
  ask_yn CONTINUE_DNS "Continui oricum?" "n"
  [[ "$CONTINUE_DNS" == "true" ]] || fail "Oprit — configurează DNS-ul și rulează din nou."
fi

ask EMAIL "Email pentru certificatul Let's Encrypt (certbot)"
ask NODE_NAME "Nume pentru acest nod (ex: bootstrap-eu-1)" "$(hostname -s 2>/dev/null || echo veiron-node-1)"

# ---------- 3. Proxy extern / nginx ----------
step "3/8 · Reverse proxy / configurație nginx"
info "Dacă acest VPS folosește deja 1Panel, OpenResty, Caddy sau alt proxy pe 80/443,"
info "alege 'da' — configurația nginx inclusă NU va fi aplicată, ca să nu intre în conflict."
ask_yn EXTERNAL_PROXY "Ai deja un reverse proxy activ pe porturile 80/443?" "n"
proxy_flag=(); [[ "$EXTERNAL_PROXY" == "true" ]] && proxy_flag=(--external-proxy)

# ---------- 4. Rețea / seed peers ----------
step "4/8 · Rețea P2P (opțional)"
info "Dacă acesta e primul nod al rețelei, lasă gol. Altfel, adaugă adresele"
info "multiaddr ale nodurilor existente (ex: /dns4/alt-nod.tld/tcp/20787)."
SEEDS=()
while true; do
  read -r -p "Adaugă un seed multiaddr (Enter gol pentru a termina): " seed_in
  seed_in="$(trim "$seed_in")"
  [[ -z "$seed_in" ]] && break
  if [[ "$seed_in" =~ ^/(dns4|ip4|ip6)/.+/tcp/[0-9]+$ ]]; then
    SEEDS+=("$seed_in"); ok "Adăugat: $seed_in"
  else
    warn "Format invalid, așteptat /dns4|ip4|ip6/HOST/tcp/PORT — ignorat."
  fi
done
seed_flags=(); for s in "${SEEDS[@]:-}"; do [[ -n "$s" ]] && seed_flags+=(--seed "$s"); done

# ---------- 5. Enrolare într-un controller existent (opțional) ----------
step "5/8 · Enrolare în flotă (opțional)"
ask_yn ENROLL "Înrolezi acest VPS într-un controller existent (alt panou /control/)?" "n"
enroll_flags=()
if [[ "$ENROLL" == "true" ]]; then
  ask CONTROLLER_URL "URL HTTPS al controllerului existent"
  ask ENROLLMENT_TOKEN "Token de enrolare (generat din panoul /control/ → Add VPS)"
  enroll_flags=(--controller-url "$CONTROLLER_URL" --enrollment-token "$ENROLLMENT_TOKEN")
fi
ask RELEASE_BUNDLE_URL "URL HTTPS al arhivei de release (folosit de acest nod ca să genereze comenzi noi)"

# ---------- 6. Wallet / mining pool ----------
step "6/8 · Wallet și mining pool (opțional)"
info "Politica implicită: acest VPS NU rulează niciodată un miner local."
info "Un 'pool' este doar coordonatorul public de shares — necesită o adresă de"
info "recompensă (wallet) dedicată, separată de orice cheie privată de semnare."
ask_yn ENABLE_POOL "Activezi rolul de mining-pool coordinator pe acest VPS?" "n"
pool_flags=()
if [[ "$ENABLE_POOL" == "true" ]]; then
  warn "Activează rolul de pool pe UN SINGUR VPS dedicat, nu pe fiecare nod de validare."
  while true; do
    ask POOL_ADDRESS "Adresa de recompensă a pool-ului (vire1...)"
    if [[ "$POOL_ADDRESS" =~ ^vire1[a-z0-9]+$ ]]; then
      break
    else
      warn "Adresa trebuie să înceapă cu 'vire1'. Introdu adresa publică a wallet-ului, NU o frază/cheie privată."
    fi
  done
  ask POOL_NAME "Nume public al pool-ului" "Veiron Reference Pool"
  pool_flags=(--enable-pool --pool-address "$POOL_ADDRESS" --pool-name "$POOL_NAME")
fi

# ---------- 7. Admin panel / firewall ----------
step "7/8 · Panou admin și firewall"
ask ADMIN_USER "Utilizator HTTP Basic pentru panoul admin" "veiron-admin"
ask_yn SKIP_FIREWALL "Sari peste configurarea automată UFW (firewall)?" "n"
fw_flag=(); [[ "$SKIP_FIREWALL" == "true" ]] && fw_flag=(--skip-firewall)

# ---------- Rezumat ----------
step "Rezumat configurație"
cat <<SUMMARY
  Bundle:            $BUNDLE
  Nod:                $NODE_NAME
  Domeniu:            $DOMAIN
  Email (certbot):    $EMAIL
  Proxy extern:       $EXTERNAL_PROXY
  Seed peers:         ${SEEDS[*]:-(niciunul — prim nod)}
  Enrolare flotă:     $ENROLL
  Mining pool:        $ENABLE_POOL ${POOL_ADDRESS:+(adresă: $POOL_ADDRESS)}
  Admin user:         $ADMIN_USER
  Firewall (UFW):     $([[ "$SKIP_FIREWALL" == "true" ]] && echo "dezactivat manual" || echo "va fi configurat")
SUMMARY
echo
ask_yn PROCEED "Pornesc instalarea (dependențe, config, nginx, deploy, verificare)?" "y"
[[ "$PROCEED" == "true" ]] || fail "Anulat de utilizator."

# ---------- Instalare (apelează install.sh existent) ----------
step "8/8 · Instalare în curs (dependențe → config → nginx → deploy → verificare)"
"$INSTALL_SH" \
  --bundle "$BUNDLE" \
  --node-name "$NODE_NAME" \
  --domain "$DOMAIN" \
  --email "$EMAIL" \
  --admin-user "$ADMIN_USER" \
  --release-bundle-url "$RELEASE_BUNDLE_URL" \
  "${seed_flags[@]}" \
  "${enroll_flags[@]}" \
  "${pool_flags[@]}" \
  "${proxy_flag[@]}" \
  "${fw_flag[@]}"

install_status=$?

# ---------- Verificare finală suplimentară ----------
step "Verificare finală a serviciilor"
if [[ -x "$HEALTH_SH" ]]; then
  if [[ "$EXTERNAL_PROXY" == "true" ]]; then
    "$HEALTH_SH" --domain "$DOMAIN" --local-only && ok "Servicii sănătoase (verificare locală)." \
      || warn "Verificarea a raportat probleme — vezi mesajele de mai sus."
  else
    "$HEALTH_SH" --domain "$DOMAIN" && ok "Servicii sănătoase (public + local)." \
      || warn "Verificarea a raportat probleme — vezi mesajele de mai sus."
  fi
else
  warn "health-check.sh nu a fost găsit lângă acest script; sări peste verificarea suplimentară."
fi

step "Gata"
ok "Instalarea s-a încheiat. Detaliile (inclusiv parola panoului admin) sunt afișate mai sus de install.sh."
info "Comenzi utile:"
echo "  sudo systemctl status veiron-node veiron-rpc veiron-vps-admin"
echo "  sudo journalctl -u veiron-vps-admin -f"
echo "  sudo $HEALTH_SH --domain $DOMAIN"

exit "${install_status:-0}"