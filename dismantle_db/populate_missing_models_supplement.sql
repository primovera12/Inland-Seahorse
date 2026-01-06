-- Supplementary SQL file to add exact model names used in dimensions SQL files
-- Run this file, then re-run all populate_equipment_dimensions_part*.sql files

-- Caterpillar models (exact names from dimensions files)
INSERT INTO models (make_id, name) SELECT id, '303' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '303.5' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '305' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '306' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '308' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '310' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '315' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '320' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '320G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '324G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '325' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '325G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '330' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '330G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '331G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '332G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '333G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '336' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '349' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '374' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '390' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '259D' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '259D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '262D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '272D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '289D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '299D' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '299D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D5' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D6' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D7' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D8' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '906F' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '926M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '938M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '950M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '966M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '972M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '416F2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '420F' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '420F2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '420XE' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '430F' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '430F2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '432F2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '440' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CB24' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CB34B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CS44B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CS56B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CS66B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CS78B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- John Deere models
INSERT INTO models (make_id, name) SELECT id, '210G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '210X4' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '250G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '250X4' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '300G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '300X4' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '350G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '350X4' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '470G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '17G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '26G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '30G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '35G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '50G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '60G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '75G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '85G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '310L' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '310SL' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '315SL' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '410L' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '317G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '325G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '331G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '332G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '333G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '544K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '624K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '724K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '650K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '700K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '750K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '850K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1050K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;

-- Komatsu models
INSERT INTO models (make_id, name) SELECT id, 'PC138' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'PC170' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'PC200' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'PC210' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'PC220' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'PC240' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'PC290' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'PC360' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'PC490' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D51' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D61' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D65' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D85' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'WA320' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'WA380' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'WA470' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'WA500' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GD555' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GD655' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GD675' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HM300' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HM400' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;

-- Hitachi models
INSERT INTO models (make_id, name) SELECT id, 'ZX130-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX135' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX160LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX200-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX210' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX225USLC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX250LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX300LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX350' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX350LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX35U-5' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX470LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX490' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX490LCH-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX55U-5' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX85' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX85USB-5' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;

-- Volvo models
INSERT INTO models (make_id, name) SELECT id, 'EC140' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC220' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC27' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC300' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC350' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC480' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC55' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L60' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L70' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L90' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L110' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L120' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L150' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L180' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L220' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L350' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'A25G' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'A30G' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'A40G' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;

-- Case models
INSERT INTO models (make_id, name) SELECT id, 'CX130D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX160D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX17B' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX210D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX245D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX250D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX300D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX350D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX470C' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '580N' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '580SN' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '580SN WT' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '580 Super N' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '590SN' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '590 Super N' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV185' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV250' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV280' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV300' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV340' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TR270' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TR310' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TR340' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1150M' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1650M' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '2050M' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;

-- JCB models
INSERT INTO models (make_id, name) SELECT id, 'JS145' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'JS160' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'JS220' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'JS260' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '3CX' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '3CX Compact' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '4CX' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '5CX' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;

-- Bobcat models
INSERT INTO models (make_id, name) SELECT id, 'E26' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E35' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E42' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E50' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E55BX' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E60' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E85' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S530' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S550' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S590' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S650' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S770' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S850' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T550' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T590' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T595' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T650' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T740' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T770' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T870' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;

-- Takeuchi models
INSERT INTO models (make_id, name) SELECT id, 'TB216' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB225' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB230' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB240' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB260' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB290' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TL10V2' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TL12V2' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;

-- Kobelco models
INSERT INTO models (make_id, name) SELECT id, 'SK55SRX' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK85CS' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK140SRLC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK210' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK210LC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK260' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK300LC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK350' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK500LC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;

-- Hyundai models
INSERT INTO models (make_id, name) SELECT id, 'HX145LCR' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX160L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX220L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX260L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX330L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX480L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HL940' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HL960' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HL970' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;

-- Doosan models
INSERT INTO models (make_id, name) SELECT id, 'DX140LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX170LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX225' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX255LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX300' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX350' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX490LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DL200' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DL250' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DL300' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DL420' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;

-- Kubota models
INSERT INTO models (make_id, name) SELECT id, 'KX040' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'KX057' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'KX080' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'KX080-4' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'U35-4' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'U55-4' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SSV65' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SSV75' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SVL65' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SVL75' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SVL95' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;

-- Yanmar models
INSERT INTO models (make_id, name) SELECT id, 'VIO35' FROM makes WHERE name = 'Yanmar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'VIO55' FROM makes WHERE name = 'Yanmar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'VIO80' FROM makes WHERE name = 'Yanmar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV08' FROM makes WHERE name = 'Yanmar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV17' FROM makes WHERE name = 'Yanmar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV26' FROM makes WHERE name = 'Yanmar' ON CONFLICT DO NOTHING;

-- SANY models
INSERT INTO models (make_id, name) SELECT id, 'SY135C' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SY215C' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SY265C' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SY365C' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;

-- Liebherr models
INSERT INTO models (make_id, name) SELECT id, 'L538' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L550' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L566' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L580' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R920' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R930' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R936' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R950' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R956' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R970' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;

-- New Holland models
INSERT INTO models (make_id, name) SELECT id, 'E17' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E26' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E35' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E50' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E60' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E80' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'C227' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'C232' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'C238' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L218' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L230' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B95B' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B95C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B110B' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B115B' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;

-- JLG models
INSERT INTO models (make_id, name) SELECT id, 'G5-18A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'G6-42A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'G9-43A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'G10-55A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'G12-55A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1043' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1055' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;

-- Genie models
INSERT INTO models (make_id, name) SELECT id, 'GTH-636' FROM makes WHERE name = 'Genie' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GTH-844' FROM makes WHERE name = 'Genie' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GTH-1056' FROM makes WHERE name = 'Genie' ON CONFLICT DO NOTHING;

-- Wacker Neuson models
INSERT INTO models (make_id, name) SELECT id, 'EZ26' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EZ36' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EZ53' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EZ80' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '6MCR' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '8MCR' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '10MCR' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '12MTX' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;

-- Bell models
INSERT INTO models (make_id, name) SELECT id, 'B25E' FROM makes WHERE name = 'Bell' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B30E' FROM makes WHERE name = 'Bell' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B40E' FROM makes WHERE name = 'Bell' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B45E' FROM makes WHERE name = 'Bell' ON CONFLICT DO NOTHING;

-- ASV models
INSERT INTO models (make_id, name) SELECT id, 'RT-30' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-40' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-50' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-65' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-75' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-120' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT185' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT210' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT250' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;

-- Terex models
INSERT INTO models (make_id, name) SELECT id, 'TC35' FROM makes WHERE name = 'Terex' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TC50' FROM makes WHERE name = 'Terex' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TC75' FROM makes WHERE name = 'Terex' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HD110' FROM makes WHERE name = 'Terex' ON CONFLICT DO NOTHING;

-- Sumitomo models
INSERT INTO models (make_id, name) SELECT id, 'SH135X-6' FROM makes WHERE name = 'Sumitomo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SH210-6' FROM makes WHERE name = 'Sumitomo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SH250-6' FROM makes WHERE name = 'Sumitomo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SH350-6' FROM makes WHERE name = 'Sumitomo' ON CONFLICT DO NOTHING;

-- Gehl models
INSERT INTO models (make_id, name) SELECT id, 'E35' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E45' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E60' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R105' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R165' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R190' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'V330' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'V420' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;

-- Mustang models
INSERT INTO models (make_id, name) SELECT id, '1650RT' FROM makes WHERE name = 'Mustang' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1750RT' FROM makes WHERE name = 'Mustang' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '2100RT' FROM makes WHERE name = 'Mustang' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '2500RT' FROM makes WHERE name = 'Mustang' ON CONFLICT DO NOTHING;

-- Sennebogen models
INSERT INTO models (make_id, name) SELECT id, '817E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '818E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '821E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '825E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '830E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;

-- Manitou models
INSERT INTO models (make_id, name) SELECT id, 'MT625' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'MT932' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'MT1135' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'MT1440' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'MT1840' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;

-- LiuGong models
INSERT INTO models (make_id, name) SELECT id, '9035E' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '906F' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '915E' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '922E' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '925E' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '950K' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;

-- Hamm models
INSERT INTO models (make_id, name) SELECT id, 'H11i' FROM makes WHERE name = 'Hamm' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HD12 VV' FROM makes WHERE name = 'Hamm' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HD14 VV' FROM makes WHERE name = 'Hamm' ON CONFLICT DO NOTHING;

-- Dynapac models
INSERT INTO models (make_id, name) SELECT id, 'CA2500D' FROM makes WHERE name = 'Dynapac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CA3500D' FROM makes WHERE name = 'Dynapac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CC1200' FROM makes WHERE name = 'Dynapac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CC2200' FROM makes WHERE name = 'Dynapac' ON CONFLICT DO NOTHING;

-- Gradall models
INSERT INTO models (make_id, name) SELECT id, 'XL3100' FROM makes WHERE name = 'Gradall' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'XL4100' FROM makes WHERE name = 'Gradall' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'XL5100' FROM makes WHERE name = 'Gradall' ON CONFLICT DO NOTHING;

-- Link-Belt models
INSERT INTO models (make_id, name) SELECT id, '75' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '130' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '145' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '160' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '210' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '250' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '300' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '350' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '490' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;

-- IHI models
INSERT INTO models (make_id, name) SELECT id, '35N' FROM makes WHERE name = 'IHI' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '55N' FROM makes WHERE name = 'IHI' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '80NX' FROM makes WHERE name = 'IHI' ON CONFLICT DO NOTHING;

-- Mecalac models
INSERT INTO models (make_id, name) SELECT id, '6MCR' FROM makes WHERE name = 'Mecalac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '8MCR' FROM makes WHERE name = 'Mecalac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '10MCR' FROM makes WHERE name = 'Mecalac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '12MTX' FROM makes WHERE name = 'Mecalac' ON CONFLICT DO NOTHING;

-- Cat scrapers
INSERT INTO models (make_id, name) SELECT id, '613G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '621H' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '623H' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '627G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '637G' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Cat motor graders
INSERT INTO models (make_id, name) SELECT id, '120' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '140' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '160' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Cat ADTs
INSERT INTO models (make_id, name) SELECT id, '725' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '730' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '740' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Cat soil compactors/rollers
INSERT INTO models (make_id, name) SELECT id, 'B90B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Sakai rollers (need to add make first)
INSERT INTO makes (name) VALUES ('Sakai') ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SW652' FROM makes WHERE name = 'Sakai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SV512' FROM makes WHERE name = 'Sakai' ON CONFLICT DO NOTHING;

-- BOMAG rollers (need to add make first)
INSERT INTO makes (name) VALUES ('BOMAG') ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'BW177' FROM makes WHERE name = 'BOMAG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'BW211' FROM makes WHERE name = 'BOMAG' ON CONFLICT DO NOTHING;

-- Additional missing excavator models
INSERT INTO models (make_id, name) SELECT id, 'E75' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E130' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E145' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E145C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E175C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E215' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E215C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E245' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E245C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E305' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E305C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E385C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E80C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;

-- Volvo rollers
INSERT INTO models (make_id, name) SELECT id, 'DD25B' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SD115B' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;

-- Additional John Deere models for completeness
INSERT INTO models (make_id, name) SELECT id, '120' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '160' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '220' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;

-- John Deere backhoes
INSERT INTO models (make_id, name) SELECT id, 'B90B' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
