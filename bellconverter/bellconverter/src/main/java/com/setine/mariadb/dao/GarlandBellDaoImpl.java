package com.setine.mariadb.dao;

import org.hibernate.Criteria;
import org.hibernate.criterion.Restrictions;
import org.springframework.stereotype.Repository;

import com.setine.mariadb.model.GarlandBell;


@Repository("userDao")
public class GarlandBellDaoImpl extends AbstractDao<Integer, GarlandBell> implements GarlandBellDao {

	public void save(GarlandBell garlandBell) {
		persist(garlandBell);
	}
	
	public GarlandBell findById(int id) {
		return getByKey(id);
	}

	public GarlandBell findByIndex(String col, String index) {
		Criteria crit = createEntityCriteria();
		crit.add(Restrictions.eq(col, index));
		return (GarlandBell) crit.uniqueResult();
	}

}
