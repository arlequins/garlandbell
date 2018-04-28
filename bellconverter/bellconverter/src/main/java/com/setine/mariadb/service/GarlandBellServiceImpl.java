package com.setine.mariadb.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.setine.mariadb.dao.GarlandBellDao;
import com.setine.mariadb.model.GarlandBell;

@Service("GarlandBellService")
@Transactional
public class GarlandBellServiceImpl implements GarlandBellService {

	@Autowired
	private GarlandBellDao dao;

	public void save(GarlandBell garlandBell) {
		dao.save(garlandBell);
	}

	public GarlandBell findById(int id) {
		return dao.findById(id);
	}

	public GarlandBell findByIndex_en(String index) {
		String col = "index_en";
		return dao.findByIndex(col, index);
	}

	public GarlandBell findByIndex_kr(String index) {
		String col = "index_kr";
		return dao.findByIndex(col, index);
	}

	public GarlandBell findByIndex_ja(String index) {
		String col = "index_ja";
		return dao.findByIndex(col, index);
	}

}
