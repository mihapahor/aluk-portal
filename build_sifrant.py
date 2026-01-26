import csv
import json
import os

INPUT_FILE = 'sifrant.csv'
OUTPUT_FILE = 'sifrant.json'

def pretvori_sifrant():
    print(f"--- Berem {INPUT_FILE} ---")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ NAPAKA: Datoteke {INPUT_FILE} ni v mapi!")
        return

    artikli = []
    
    # Seznam kodnih tabel, ki jih poskusimo (za slovenske znake)
    encodings = ['utf-8', 'cp1250', 'cp1252', 'latin1']
    
    uspesno_prebrano = False
    
    for encoding in encodings:
        try:
            print(f"Poskušam brati z uporabo: {encoding} ...")
            with open(INPUT_FILE, 'r', encoding=encoding) as f:
                # Preberemo prvo vrstico za test
                line = f.readline()
                if not line:
                    break 
                
                # Uganemo ločilo (podpičje ali vejica)
                try:
                    dialect = csv.Sniffer().sniff(line)
                except:
                    dialect = 'excel'
                
                f.seek(0)
                reader = csv.reader(f, dialect)
                
                # Resetiramo seznam za nov poskus
                temp_artikli = []
                count = 0
                
                # Preskočimo glavo, če obstaja (če prva vrstica ne vsebuje številk)
                # Tu raje beremo vse, frontend bo filtriral
                for row in reader:
                    if len(row) >= 2:
                        sifra = row[0].strip()
                        opis = row[1].strip()
                        
                        # Čiščenje čudnih znakov na začetku datoteke (BOM)
                        if count == 0:
                            sifra = sifra.replace('\ufeff', '')

                        if sifra and opis:
                            temp_artikli.append({
                                "sifra": sifra,
                                "opis": opis
                            })
                            count += 1
                
                artikli = temp_artikli
                print(f"✅ Uspešno prebrano {count} artiklov (uporabljen {encoding}).")
                uspesno_prebrano = True
                break # Če smo prišli do sem, je uspelo, nehamo poskušati

        except UnicodeDecodeError:
            print(f"   -> Neuspešno z {encoding}, poskušam naslednjega...")
            continue
        except Exception as e:
            print(f"❌ Druga napaka: {e}")
            break

    if not uspesno_prebrano:
        print("❌ Žal datoteke ni bilo mogoče prebrati z nobenim standardnim kodiranjem.")
        return

    # Shranimo v JSON (vedno UTF-8 za splet)
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(artikli, f, ensure_ascii=False)
        print(f"✅ Ustvarjena datoteka: {OUTPUT_FILE} (Pripravljeno za objavo)")
    except Exception as e:
        print(f"❌ Napaka pri shranjevanju JSON: {e}")

if __name__ == "__main__":
    pretvori_sifrant()