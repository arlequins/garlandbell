package com.setine.mongodb;

import java.util.ArrayList;

import com.setine.db.model.Setine;


public interface GarlandDAO {

	Setine getGarlandOne(String key);

	ArrayList<Setine> getGarlandTxt();

	Setine insert(Setine object);

	void update(Setine object, String key, Object cValue);

}
