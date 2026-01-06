-- ============================================================
-- ADD MISSING MODELS FOR EQUIPMENT DIMENSIONS
-- ============================================================
-- This file adds ~200 models referenced in the dimensions SQL files
-- Run this BEFORE running the populate_equipment_dimensions files
-- ============================================================

-- =====================================================
-- CATERPILLAR MODELS
-- =====================================================

-- Caterpillar Excavators
INSERT INTO models (make_id, name) SELECT id, '303.5E2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '305.5E2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '306' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '307' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '308' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '309' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '310' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '311' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '312' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '313' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '315' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '316' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '317' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '318' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '320GC' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '323' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '325' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '326' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '330GC' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '335' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '336GC' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '352' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '374' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '390' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Caterpillar Motor Graders
INSERT INTO models (make_id, name) SELECT id, '120' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '140' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '160' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Caterpillar Articulated Trucks
INSERT INTO models (make_id, name) SELECT id, '725' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '730' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '735' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '740' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '745' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Caterpillar Wheel Loaders
INSERT INTO models (make_id, name) SELECT id, '950M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '966M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '972M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '980M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '982M' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Caterpillar Compact Track Loaders / Skid Steers
INSERT INTO models (make_id, name) SELECT id, '239D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '249D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '255D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '259D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '262D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '265D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '272D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '279D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '289D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '299D3' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Caterpillar Backhoe Loaders
INSERT INTO models (make_id, name) SELECT id, '416F2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '420F2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '420XE' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '430F2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '432F2' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '440' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- Caterpillar Rollers
INSERT INTO models (make_id, name) SELECT id, 'CB24' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CB34B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CS44B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CS56B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CS66B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CS78B' FROM makes WHERE name = 'Caterpillar' ON CONFLICT DO NOTHING;

-- =====================================================
-- CASE MODELS
-- =====================================================

-- Case Excavators (CX Series)
INSERT INTO models (make_id, name) SELECT id, 'CX130D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX160D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX210D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX250D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX300D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX350D' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CX470C' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;

-- Case Dozers
INSERT INTO models (make_id, name) SELECT id, '650K' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '750K' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '850M' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1150M' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1650M' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '2050M' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;

-- Case Backhoe Loaders
INSERT INTO models (make_id, name) SELECT id, '580 Super N' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '580SN WT' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '590 Super N' FROM makes WHERE name = 'Case' ON CONFLICT DO NOTHING;

-- =====================================================
-- JOHN DEERE MODELS
-- =====================================================

-- John Deere Excavators
INSERT INTO models (make_id, name) SELECT id, '135G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '160G LC' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '180G LC' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '210G LC' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '250G LC' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '300G LC' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '345G LC' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '380G LC' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '470G LC' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;

-- John Deere Dozers
INSERT INTO models (make_id, name) SELECT id, '700K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '750K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '850K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '950K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '1050K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;

-- John Deere Wheel Loaders
INSERT INTO models (make_id, name) SELECT id, '444K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '524K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '544K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '624K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '644K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '724K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '744K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '844K' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;

-- John Deere Compact Track Loaders
INSERT INTO models (make_id, name) SELECT id, '317G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '325G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '331G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '333G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;

-- John Deere Skid Steers (additional)
INSERT INTO models (make_id, name) SELECT id, '330G' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;

-- John Deere Backhoe Loaders
INSERT INTO models (make_id, name) SELECT id, '310L' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '310SL' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '315SL' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '410L' FROM makes WHERE name = 'John Deere' ON CONFLICT DO NOTHING;

-- =====================================================
-- KOMATSU MODELS
-- =====================================================

-- Komatsu Dozers
INSERT INTO models (make_id, name) SELECT id, 'D37' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D39' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D51' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D61' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D65' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D85' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D155' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D275' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'D375' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;

-- Komatsu Motor Graders
INSERT INTO models (make_id, name) SELECT id, 'GD555' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GD655' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GD675' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;

-- Komatsu Articulated Trucks
INSERT INTO models (make_id, name) SELECT id, 'HM300' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HM400' FROM makes WHERE name = 'Komatsu' ON CONFLICT DO NOTHING;

-- =====================================================
-- HITACHI MODELS
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'ZX35U-5' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX55U-5' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX85USB-5' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX130-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX160LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX200-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX225USLC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX250LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX300LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX350LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX470LC-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ZX490LCH-6' FROM makes WHERE name = 'Hitachi' ON CONFLICT DO NOTHING;

-- =====================================================
-- HYUNDAI MODELS
-- =====================================================

-- Hyundai Excavators
INSERT INTO models (make_id, name) SELECT id, 'HX145LCR' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX160L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX220L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX260L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX330L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX480L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HX520L' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;

-- Hyundai Wheel Loaders
INSERT INTO models (make_id, name) SELECT id, 'HL940' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HL955' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HL960' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HL970' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HL980' FROM makes WHERE name = 'Hyundai' ON CONFLICT DO NOTHING;

-- =====================================================
-- DOOSAN MODELS
-- =====================================================

-- Doosan Excavators
INSERT INTO models (make_id, name) SELECT id, 'DX140LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX170LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX225LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX255LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX300LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX350LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX420LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DX490LC' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;

-- Doosan Wheel Loaders
INSERT INTO models (make_id, name) SELECT id, 'DL200' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DL250' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DL300' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'DL420' FROM makes WHERE name = 'Doosan' ON CONFLICT DO NOTHING;

-- =====================================================
-- KOBELCO MODELS
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'SK55SRX' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK85CS' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK140SRLC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK210LC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK260LC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK300LC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK350LC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SK500LC' FROM makes WHERE name = 'Kobelco' ON CONFLICT DO NOTHING;

-- =====================================================
-- VOLVO MODELS
-- =====================================================

-- Volvo Mini Excavators
INSERT INTO models (make_id, name) SELECT id, 'EC27' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC35' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC55' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'ECR88' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EC140' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;

-- Volvo Articulated Trucks
INSERT INTO models (make_id, name) SELECT id, 'A25G' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'A30G' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'A35G' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'A40G' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'A45G' FROM makes WHERE name = 'Volvo' ON CONFLICT DO NOTHING;

-- =====================================================
-- BOBCAT MODELS
-- =====================================================

-- Bobcat Excavators
INSERT INTO models (make_id, name) SELECT id, 'E42' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E50' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E60' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E85' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E145' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;

-- Bobcat Compact Track Loaders
INSERT INTO models (make_id, name) SELECT id, 'T550' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T590' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T595' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T650' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T740' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T770' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'T870' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;

-- Bobcat Skid Steers (additional)
INSERT INTO models (make_id, name) SELECT id, 'S530' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S550' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S590' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S650' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S770' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'S850' FROM makes WHERE name = 'Bobcat' ON CONFLICT DO NOTHING;

-- =====================================================
-- JCB MODELS
-- =====================================================

-- JCB Excavators
INSERT INTO models (make_id, name) SELECT id, 'JS145' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'JS160' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'JS220' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'JS260' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'JS300' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'JS370' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;

-- JCB Backhoe Loaders
INSERT INTO models (make_id, name) SELECT id, '3CX' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '3CX Compact' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '4CX' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '5CX' FROM makes WHERE name = 'JCB' ON CONFLICT DO NOTHING;

-- =====================================================
-- TAKEUCHI MODELS
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'TB216' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB225' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB230' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB240' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB250' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB260' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB290' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TB2150' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TL10V2' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TL12V2' FROM makes WHERE name = 'Takeuchi' ON CONFLICT DO NOTHING;

-- =====================================================
-- LIEBHERR MODELS
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'R920' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R924' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R930' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R936' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R945' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R950' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R956' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'R970' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L538' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L550' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L566' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'L580' FROM makes WHERE name = 'Liebherr' ON CONFLICT DO NOTHING;

-- =====================================================
-- SANY MODELS
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'SY135C' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SY215C' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SY265C' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SY365C' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SY500H' FROM makes WHERE name = 'SANY' ON CONFLICT DO NOTHING;

-- =====================================================
-- LINK-BELT MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Link-Belt') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, '145X4' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '210X4' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '250X4' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '300X4' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '350X4' FROM makes WHERE name = 'Link-Belt' ON CONFLICT DO NOTHING;

-- =====================================================
-- BELL MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Bell') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'B25E' FROM makes WHERE name = 'Bell' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B30E' FROM makes WHERE name = 'Bell' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B40E' FROM makes WHERE name = 'Bell' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'B45E' FROM makes WHERE name = 'Bell' ON CONFLICT DO NOTHING;

-- =====================================================
-- ASV MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('ASV') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'RT-30' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-40' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-50' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-65' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-75' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT-120' FROM makes WHERE name = 'ASV' ON CONFLICT DO NOTHING;

-- =====================================================
-- GEHL MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Gehl') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'RT185' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT210' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'RT250' FROM makes WHERE name = 'Gehl' ON CONFLICT DO NOTHING;

-- =====================================================
-- MUSTANG MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Mustang') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, '1750RT' FROM makes WHERE name = 'Mustang' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '2100RT' FROM makes WHERE name = 'Mustang' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '2500RT' FROM makes WHERE name = 'Mustang' ON CONFLICT DO NOTHING;

-- =====================================================
-- WACKER NEUSON MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Wacker Neuson') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'EZ26' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EZ36' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EZ53' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'EZ80' FROM makes WHERE name = 'Wacker Neuson' ON CONFLICT DO NOTHING;

-- =====================================================
-- TEREX MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Terex') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'TC35' FROM makes WHERE name = 'Terex' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TC50' FROM makes WHERE name = 'Terex' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'TC75' FROM makes WHERE name = 'Terex' ON CONFLICT DO NOTHING;

-- =====================================================
-- SUMITOMO MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Sumitomo') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'SH135X-6' FROM makes WHERE name = 'Sumitomo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SH210-6' FROM makes WHERE name = 'Sumitomo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SH250-6' FROM makes WHERE name = 'Sumitomo' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'SH350-6' FROM makes WHERE name = 'Sumitomo' ON CONFLICT DO NOTHING;

-- =====================================================
-- IHI MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('IHI') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, '35N' FROM makes WHERE name = 'IHI' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '55N' FROM makes WHERE name = 'IHI' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '80NX' FROM makes WHERE name = 'IHI' ON CONFLICT DO NOTHING;

-- =====================================================
-- MECALAC MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Mecalac') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, '6MCR' FROM makes WHERE name = 'Mecalac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '8MCR' FROM makes WHERE name = 'Mecalac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '10MCR' FROM makes WHERE name = 'Mecalac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '12MTX' FROM makes WHERE name = 'Mecalac' ON CONFLICT DO NOTHING;

-- =====================================================
-- GRADALL MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Gradall') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'XL3100' FROM makes WHERE name = 'Gradall' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'XL4100' FROM makes WHERE name = 'Gradall' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'XL5100' FROM makes WHERE name = 'Gradall' ON CONFLICT DO NOTHING;

-- =====================================================
-- SENNEBOGEN MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Sennebogen') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, '817E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '818E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '821E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '825E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '830E' FROM makes WHERE name = 'Sennebogen' ON CONFLICT DO NOTHING;

-- =====================================================
-- MANITOU MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Manitou') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'MT625' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'MT932' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'MT1135' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'MT1440' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'MT1840' FROM makes WHERE name = 'Manitou' ON CONFLICT DO NOTHING;

-- =====================================================
-- LIUGONG MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('LiuGong') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, '9035E' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '906F' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '915E' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '922E' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, '925E' FROM makes WHERE name = 'LiuGong' ON CONFLICT DO NOTHING;

-- =====================================================
-- JLG MODELS
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'G5-18A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'G6-42A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'G9-43A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'G10-55A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'G12-55A' FROM makes WHERE name = 'JLG' ON CONFLICT DO NOTHING;

-- =====================================================
-- GENIE MODELS
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'GTH-636' FROM makes WHERE name = 'Genie' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GTH-844' FROM makes WHERE name = 'Genie' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'GTH-1056' FROM makes WHERE name = 'Genie' ON CONFLICT DO NOTHING;

-- =====================================================
-- HAMM MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Hamm') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'HD12 VV' FROM makes WHERE name = 'Hamm' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HD14 VV' FROM makes WHERE name = 'Hamm' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'HD110' FROM makes WHERE name = 'Hamm' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'H11i' FROM makes WHERE name = 'Hamm' ON CONFLICT DO NOTHING;

-- =====================================================
-- DYNAPAC MODELS
-- =====================================================

-- First add the make if it doesn't exist
INSERT INTO makes (name) VALUES ('Dynapac') ON CONFLICT DO NOTHING;

INSERT INTO models (make_id, name) SELECT id, 'CC1200' FROM makes WHERE name = 'Dynapac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CC2200' FROM makes WHERE name = 'Dynapac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CA2500D' FROM makes WHERE name = 'Dynapac' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'CA3500D' FROM makes WHERE name = 'Dynapac' ON CONFLICT DO NOTHING;

-- =====================================================
-- NEW HOLLAND MODELS
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'E55BX' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E80C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E145C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E175C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E215C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E245C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E305C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'E385C' FROM makes WHERE name = 'New Holland' ON CONFLICT DO NOTHING;

-- =====================================================
-- KUBOTA MODELS (additional)
-- =====================================================

INSERT INTO models (make_id, name) SELECT id, 'U35-4' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'U55-4' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;
INSERT INTO models (make_id, name) SELECT id, 'KX080-4' FROM makes WHERE name = 'Kubota' ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'New makes added:' as info;
SELECT name FROM makes ORDER BY name;

SELECT 'Total models in database:' as info;
SELECT COUNT(*) as total_models FROM models;

SELECT 'Models by make:' as info;
SELECT mk.name as make, COUNT(m.id) as model_count
FROM makes mk
LEFT JOIN models m ON m.make_id = mk.id
GROUP BY mk.name
ORDER BY model_count DESC;
