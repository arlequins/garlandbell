package com.setine.mariadb.dao;

import com.setine.mariadb.model.GarlandBell;

public interface GarlandBellDao {

	void save(GarlandBell garlandBell);

	GarlandBell findById(int id);

	GarlandBell findByIndex(String col, String index);

}
