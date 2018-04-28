package com.setine.mariadb.service;

import com.setine.mariadb.model.GarlandBell;

public interface GarlandBellService {

	void save(GarlandBell garlandBell);

	GarlandBell findById(int id);

	GarlandBell findByIndex_en(String index);

	GarlandBell findByIndex_kr(String index);

	GarlandBell findByIndex_ja(String index);

}