import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  bigint: { input: any; output: any; }
  inet: { input: string; output: string; }
  jsonb: { input: unknown; output: unknown; }
  macaddr: { input: string; output: string; }
  timestamptz: { input: string; output: string; }
  uuid: { input: string; output: string; }
};

/** Boolean expression to compare columns of type "Float". All fields are combined with logical 'AND'. */
export type Float_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Float']['input']>;
  _gt?: InputMaybe<Scalars['Float']['input']>;
  _gte?: InputMaybe<Scalars['Float']['input']>;
  _in?: InputMaybe<Array<Scalars['Float']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Float']['input']>;
  _lte?: InputMaybe<Scalars['Float']['input']>;
  _neq?: InputMaybe<Scalars['Float']['input']>;
  _nin?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _gt?: InputMaybe<Scalars['Int']['input']>;
  _gte?: InputMaybe<Scalars['Int']['input']>;
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Int']['input']>;
  _lte?: InputMaybe<Scalars['Int']['input']>;
  _neq?: InputMaybe<Scalars['Int']['input']>;
  _nin?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Array_Comparison_Exp = {
  /** is the array contained in the given array value */
  _contained_in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the array contain the given value */
  _contains?: InputMaybe<Array<Scalars['String']['input']>>;
  _eq?: InputMaybe<Array<Scalars['String']['input']>>;
  _gt?: InputMaybe<Array<Scalars['String']['input']>>;
  _gte?: InputMaybe<Array<Scalars['String']['input']>>;
  _in?: InputMaybe<Array<Array<Scalars['String']['input']>>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Array<Scalars['String']['input']>>;
  _lte?: InputMaybe<Array<Scalars['String']['input']>>;
  _neq?: InputMaybe<Array<Scalars['String']['input']>>;
  _nin?: InputMaybe<Array<Array<Scalars['String']['input']>>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
  _gt?: InputMaybe<Scalars['String']['input']>;
  _gte?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars['String']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars['String']['input']>;
  _lt?: InputMaybe<Scalars['String']['input']>;
  _lte?: InputMaybe<Scalars['String']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "assets" */
export type Assets = {
  __typename?: 'assets';
  created_at: Scalars['timestamptz']['output'];
  data?: Maybe<Scalars['jsonb']['output']>;
  id: Scalars['uuid']['output'];
  /** An object relationship */
  job?: Maybe<Jobs>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  kind: Scalars['String']['output'];
  path?: Maybe<Scalars['String']['output']>;
  /** An object relationship */
  video: Videos;
  video_id: Scalars['uuid']['output'];
};


/** columns and relationships of "assets" */
export type AssetsDataArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "assets" */
export type Assets_Aggregate = {
  __typename?: 'assets_aggregate';
  aggregate?: Maybe<Assets_Aggregate_Fields>;
  nodes: Array<Assets>;
};

export type Assets_Aggregate_Bool_Exp = {
  count?: InputMaybe<Assets_Aggregate_Bool_Exp_Count>;
};

export type Assets_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Assets_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Assets_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "assets" */
export type Assets_Aggregate_Fields = {
  __typename?: 'assets_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Assets_Max_Fields>;
  min?: Maybe<Assets_Min_Fields>;
};


/** aggregate fields of "assets" */
export type Assets_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Assets_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "assets" */
export type Assets_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Assets_Max_Order_By>;
  min?: InputMaybe<Assets_Min_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Assets_Append_Input = {
  data?: InputMaybe<Scalars['jsonb']['input']>;
};

/** input type for inserting array relation for remote table "assets" */
export type Assets_Arr_Rel_Insert_Input = {
  data: Array<Assets_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Assets_On_Conflict>;
};

/** Boolean expression to filter rows from the table "assets". All fields are combined with a logical 'AND'. */
export type Assets_Bool_Exp = {
  _and?: InputMaybe<Array<Assets_Bool_Exp>>;
  _not?: InputMaybe<Assets_Bool_Exp>;
  _or?: InputMaybe<Array<Assets_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  data?: InputMaybe<Jsonb_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  job?: InputMaybe<Jobs_Bool_Exp>;
  job_id?: InputMaybe<Uuid_Comparison_Exp>;
  kind?: InputMaybe<String_Comparison_Exp>;
  path?: InputMaybe<String_Comparison_Exp>;
  video?: InputMaybe<Videos_Bool_Exp>;
  video_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "assets" */
export enum Assets_Constraint {
  /** unique or primary key constraint on columns "id" */
  AssetsPkey = 'assets_pkey',
  /** unique or primary key constraint on columns "video_id", "kind" */
  AssetsVideoIdKindKey = 'assets_video_id_kind_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Assets_Delete_At_Path_Input = {
  data?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Assets_Delete_Elem_Input = {
  data?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Assets_Delete_Key_Input = {
  data?: InputMaybe<Scalars['String']['input']>;
};

/** input type for inserting data into table "assets" */
export type Assets_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  data?: InputMaybe<Scalars['jsonb']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job?: InputMaybe<Jobs_Obj_Rel_Insert_Input>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  video?: InputMaybe<Videos_Obj_Rel_Insert_Input>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Assets_Max_Fields = {
  __typename?: 'assets_max_fields';
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by max() on columns of table "assets" */
export type Assets_Max_Order_By = {
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job_id?: InputMaybe<Order_By>;
  kind?: InputMaybe<Order_By>;
  path?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Assets_Min_Fields = {
  __typename?: 'assets_min_fields';
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by min() on columns of table "assets" */
export type Assets_Min_Order_By = {
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job_id?: InputMaybe<Order_By>;
  kind?: InputMaybe<Order_By>;
  path?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "assets" */
export type Assets_Mutation_Response = {
  __typename?: 'assets_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Assets>;
};

/** on_conflict condition type for table "assets" */
export type Assets_On_Conflict = {
  constraint: Assets_Constraint;
  update_columns?: Array<Assets_Update_Column>;
  where?: InputMaybe<Assets_Bool_Exp>;
};

/** Ordering options when selecting data from "assets". */
export type Assets_Order_By = {
  created_at?: InputMaybe<Order_By>;
  data?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job?: InputMaybe<Jobs_Order_By>;
  job_id?: InputMaybe<Order_By>;
  kind?: InputMaybe<Order_By>;
  path?: InputMaybe<Order_By>;
  video?: InputMaybe<Videos_Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: assets */
export type Assets_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Assets_Prepend_Input = {
  data?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "assets" */
export enum Assets_Select_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Data = 'data',
  /** column name */
  Id = 'id',
  /** column name */
  JobId = 'job_id',
  /** column name */
  Kind = 'kind',
  /** column name */
  Path = 'path',
  /** column name */
  VideoId = 'video_id'
}

/** input type for updating data in table "assets" */
export type Assets_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  data?: InputMaybe<Scalars['jsonb']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "assets" */
export type Assets_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Assets_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Assets_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  data?: InputMaybe<Scalars['jsonb']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "assets" */
export enum Assets_Update_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Data = 'data',
  /** column name */
  Id = 'id',
  /** column name */
  JobId = 'job_id',
  /** column name */
  Kind = 'kind',
  /** column name */
  Path = 'path',
  /** column name */
  VideoId = 'video_id'
}

export type Assets_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Assets_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Assets_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Assets_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Assets_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Assets_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Assets_Set_Input>;
  /** filter the rows which have to be updated */
  where: Assets_Bool_Exp;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['bigint']['input']>;
  _gt?: InputMaybe<Scalars['bigint']['input']>;
  _gte?: InputMaybe<Scalars['bigint']['input']>;
  _in?: InputMaybe<Array<Scalars['bigint']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['bigint']['input']>;
  _lte?: InputMaybe<Scalars['bigint']['input']>;
  _neq?: InputMaybe<Scalars['bigint']['input']>;
  _nin?: InputMaybe<Array<Scalars['bigint']['input']>>;
};

/** ordering argument of a cursor */
export enum Cursor_Ordering {
  /** ascending ordering of the cursor */
  Asc = 'ASC',
  /** descending ordering of the cursor */
  Desc = 'DESC'
}

/** Boolean expression to compare columns of type "inet". All fields are combined with logical 'AND'. */
export type Inet_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['inet']['input']>;
  _gt?: InputMaybe<Scalars['inet']['input']>;
  _gte?: InputMaybe<Scalars['inet']['input']>;
  _in?: InputMaybe<Array<Scalars['inet']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['inet']['input']>;
  _lte?: InputMaybe<Scalars['inet']['input']>;
  _neq?: InputMaybe<Scalars['inet']['input']>;
  _nin?: InputMaybe<Array<Scalars['inet']['input']>>;
};

/** columns and relationships of "jobs" */
export type Jobs = {
  __typename?: 'jobs';
  /** An array relationship */
  assets: Array<Assets>;
  /** An aggregate relationship */
  assets_aggregate: Assets_Aggregate;
  attempts: Scalars['Int']['output'];
  /** An array relationship */
  child_jobs: Array<Jobs>;
  /** An aggregate relationship */
  child_jobs_aggregate: Jobs_Aggregate;
  claimed_at?: Maybe<Scalars['timestamptz']['output']>;
  claimed_by?: Maybe<Scalars['uuid']['output']>;
  created_at: Scalars['timestamptz']['output'];
  error?: Maybe<Scalars['String']['output']>;
  heartbeat_at?: Maybe<Scalars['timestamptz']['output']>;
  id: Scalars['uuid']['output'];
  /** An object relationship */
  machine?: Maybe<Machines>;
  max_attempts: Scalars['Int']['output'];
  /** An object relationship */
  parent_job?: Maybe<Jobs>;
  parent_job_id?: Maybe<Scalars['uuid']['output']>;
  payload: Scalars['jsonb']['output'];
  priority: Scalars['Int']['output'];
  progress?: Maybe<Scalars['Float']['output']>;
  progress_note?: Maybe<Scalars['String']['output']>;
  result?: Maybe<Scalars['jsonb']['output']>;
  run_after: Scalars['timestamptz']['output'];
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updated_at: Scalars['timestamptz']['output'];
  /** An object relationship */
  video?: Maybe<Videos>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};


/** columns and relationships of "jobs" */
export type JobsAssetsArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


/** columns and relationships of "jobs" */
export type JobsAssets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


/** columns and relationships of "jobs" */
export type JobsChild_JobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "jobs" */
export type JobsChild_Jobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "jobs" */
export type JobsPayloadArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};


/** columns and relationships of "jobs" */
export type JobsResultArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "jobs" */
export type Jobs_Aggregate = {
  __typename?: 'jobs_aggregate';
  aggregate?: Maybe<Jobs_Aggregate_Fields>;
  nodes: Array<Jobs>;
};

export type Jobs_Aggregate_Bool_Exp = {
  count?: InputMaybe<Jobs_Aggregate_Bool_Exp_Count>;
};

export type Jobs_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Jobs_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Jobs_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "jobs" */
export type Jobs_Aggregate_Fields = {
  __typename?: 'jobs_aggregate_fields';
  avg?: Maybe<Jobs_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Jobs_Max_Fields>;
  min?: Maybe<Jobs_Min_Fields>;
  stddev?: Maybe<Jobs_Stddev_Fields>;
  stddev_pop?: Maybe<Jobs_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Jobs_Stddev_Samp_Fields>;
  sum?: Maybe<Jobs_Sum_Fields>;
  var_pop?: Maybe<Jobs_Var_Pop_Fields>;
  var_samp?: Maybe<Jobs_Var_Samp_Fields>;
  variance?: Maybe<Jobs_Variance_Fields>;
};


/** aggregate fields of "jobs" */
export type Jobs_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Jobs_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "jobs" */
export type Jobs_Aggregate_Order_By = {
  avg?: InputMaybe<Jobs_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Jobs_Max_Order_By>;
  min?: InputMaybe<Jobs_Min_Order_By>;
  stddev?: InputMaybe<Jobs_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Jobs_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Jobs_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Jobs_Sum_Order_By>;
  var_pop?: InputMaybe<Jobs_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Jobs_Var_Samp_Order_By>;
  variance?: InputMaybe<Jobs_Variance_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Jobs_Append_Input = {
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
};

/** input type for inserting array relation for remote table "jobs" */
export type Jobs_Arr_Rel_Insert_Input = {
  data: Array<Jobs_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Jobs_On_Conflict>;
};

/** aggregate avg on columns */
export type Jobs_Avg_Fields = {
  __typename?: 'jobs_avg_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by avg() on columns of table "jobs" */
export type Jobs_Avg_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "jobs". All fields are combined with a logical 'AND'. */
export type Jobs_Bool_Exp = {
  _and?: InputMaybe<Array<Jobs_Bool_Exp>>;
  _not?: InputMaybe<Jobs_Bool_Exp>;
  _or?: InputMaybe<Array<Jobs_Bool_Exp>>;
  assets?: InputMaybe<Assets_Bool_Exp>;
  assets_aggregate?: InputMaybe<Assets_Aggregate_Bool_Exp>;
  attempts?: InputMaybe<Int_Comparison_Exp>;
  child_jobs?: InputMaybe<Jobs_Bool_Exp>;
  child_jobs_aggregate?: InputMaybe<Jobs_Aggregate_Bool_Exp>;
  claimed_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  claimed_by?: InputMaybe<Uuid_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  error?: InputMaybe<String_Comparison_Exp>;
  heartbeat_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  machine?: InputMaybe<Machines_Bool_Exp>;
  max_attempts?: InputMaybe<Int_Comparison_Exp>;
  parent_job?: InputMaybe<Jobs_Bool_Exp>;
  parent_job_id?: InputMaybe<Uuid_Comparison_Exp>;
  payload?: InputMaybe<Jsonb_Comparison_Exp>;
  priority?: InputMaybe<Int_Comparison_Exp>;
  progress?: InputMaybe<Float_Comparison_Exp>;
  progress_note?: InputMaybe<String_Comparison_Exp>;
  result?: InputMaybe<Jsonb_Comparison_Exp>;
  run_after?: InputMaybe<Timestamptz_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  type?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  video?: InputMaybe<Videos_Bool_Exp>;
  video_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "jobs" */
export enum Jobs_Constraint {
  /** unique or primary key constraint on columns "id" */
  JobsPkey = 'jobs_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Jobs_Delete_At_Path_Input = {
  payload?: InputMaybe<Array<Scalars['String']['input']>>;
  result?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Jobs_Delete_Elem_Input = {
  payload?: InputMaybe<Scalars['Int']['input']>;
  result?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Jobs_Delete_Key_Input = {
  payload?: InputMaybe<Scalars['String']['input']>;
  result?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "jobs" */
export type Jobs_Inc_Input = {
  attempts?: InputMaybe<Scalars['Int']['input']>;
  max_attempts?: InputMaybe<Scalars['Int']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  progress?: InputMaybe<Scalars['Float']['input']>;
};

/** input type for inserting data into table "jobs" */
export type Jobs_Insert_Input = {
  assets?: InputMaybe<Assets_Arr_Rel_Insert_Input>;
  attempts?: InputMaybe<Scalars['Int']['input']>;
  child_jobs?: InputMaybe<Jobs_Arr_Rel_Insert_Input>;
  claimed_at?: InputMaybe<Scalars['timestamptz']['input']>;
  claimed_by?: InputMaybe<Scalars['uuid']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  heartbeat_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  machine?: InputMaybe<Machines_Obj_Rel_Insert_Input>;
  max_attempts?: InputMaybe<Scalars['Int']['input']>;
  parent_job?: InputMaybe<Jobs_Obj_Rel_Insert_Input>;
  parent_job_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  progress?: InputMaybe<Scalars['Float']['input']>;
  progress_note?: InputMaybe<Scalars['String']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
  run_after?: InputMaybe<Scalars['timestamptz']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video?: InputMaybe<Videos_Obj_Rel_Insert_Input>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Jobs_Max_Fields = {
  __typename?: 'jobs_max_fields';
  attempts?: Maybe<Scalars['Int']['output']>;
  claimed_at?: Maybe<Scalars['timestamptz']['output']>;
  claimed_by?: Maybe<Scalars['uuid']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  heartbeat_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  max_attempts?: Maybe<Scalars['Int']['output']>;
  parent_job_id?: Maybe<Scalars['uuid']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
  progress_note?: Maybe<Scalars['String']['output']>;
  run_after?: Maybe<Scalars['timestamptz']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by max() on columns of table "jobs" */
export type Jobs_Max_Order_By = {
  attempts?: InputMaybe<Order_By>;
  claimed_at?: InputMaybe<Order_By>;
  claimed_by?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  heartbeat_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  parent_job_id?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
  progress_note?: InputMaybe<Order_By>;
  run_after?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Jobs_Min_Fields = {
  __typename?: 'jobs_min_fields';
  attempts?: Maybe<Scalars['Int']['output']>;
  claimed_at?: Maybe<Scalars['timestamptz']['output']>;
  claimed_by?: Maybe<Scalars['uuid']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  heartbeat_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  max_attempts?: Maybe<Scalars['Int']['output']>;
  parent_job_id?: Maybe<Scalars['uuid']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
  progress_note?: Maybe<Scalars['String']['output']>;
  run_after?: Maybe<Scalars['timestamptz']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by min() on columns of table "jobs" */
export type Jobs_Min_Order_By = {
  attempts?: InputMaybe<Order_By>;
  claimed_at?: InputMaybe<Order_By>;
  claimed_by?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  heartbeat_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  parent_job_id?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
  progress_note?: InputMaybe<Order_By>;
  run_after?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "jobs" */
export type Jobs_Mutation_Response = {
  __typename?: 'jobs_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Jobs>;
};

/** input type for inserting object relation for remote table "jobs" */
export type Jobs_Obj_Rel_Insert_Input = {
  data: Jobs_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Jobs_On_Conflict>;
};

/** on_conflict condition type for table "jobs" */
export type Jobs_On_Conflict = {
  constraint: Jobs_Constraint;
  update_columns?: Array<Jobs_Update_Column>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};

/** Ordering options when selecting data from "jobs". */
export type Jobs_Order_By = {
  assets_aggregate?: InputMaybe<Assets_Aggregate_Order_By>;
  attempts?: InputMaybe<Order_By>;
  child_jobs_aggregate?: InputMaybe<Jobs_Aggregate_Order_By>;
  claimed_at?: InputMaybe<Order_By>;
  claimed_by?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  heartbeat_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  machine?: InputMaybe<Machines_Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  parent_job?: InputMaybe<Jobs_Order_By>;
  parent_job_id?: InputMaybe<Order_By>;
  payload?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
  progress_note?: InputMaybe<Order_By>;
  result?: InputMaybe<Order_By>;
  run_after?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video?: InputMaybe<Videos_Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: jobs */
export type Jobs_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Jobs_Prepend_Input = {
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "jobs" */
export enum Jobs_Select_Column {
  /** column name */
  Attempts = 'attempts',
  /** column name */
  ClaimedAt = 'claimed_at',
  /** column name */
  ClaimedBy = 'claimed_by',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Error = 'error',
  /** column name */
  HeartbeatAt = 'heartbeat_at',
  /** column name */
  Id = 'id',
  /** column name */
  MaxAttempts = 'max_attempts',
  /** column name */
  ParentJobId = 'parent_job_id',
  /** column name */
  Payload = 'payload',
  /** column name */
  Priority = 'priority',
  /** column name */
  Progress = 'progress',
  /** column name */
  ProgressNote = 'progress_note',
  /** column name */
  Result = 'result',
  /** column name */
  RunAfter = 'run_after',
  /** column name */
  Status = 'status',
  /** column name */
  Type = 'type',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VideoId = 'video_id'
}

/** input type for updating data in table "jobs" */
export type Jobs_Set_Input = {
  attempts?: InputMaybe<Scalars['Int']['input']>;
  claimed_at?: InputMaybe<Scalars['timestamptz']['input']>;
  claimed_by?: InputMaybe<Scalars['uuid']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  heartbeat_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  max_attempts?: InputMaybe<Scalars['Int']['input']>;
  parent_job_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  progress?: InputMaybe<Scalars['Float']['input']>;
  progress_note?: InputMaybe<Scalars['String']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
  run_after?: InputMaybe<Scalars['timestamptz']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate stddev on columns */
export type Jobs_Stddev_Fields = {
  __typename?: 'jobs_stddev_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev() on columns of table "jobs" */
export type Jobs_Stddev_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Jobs_Stddev_Pop_Fields = {
  __typename?: 'jobs_stddev_pop_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_pop() on columns of table "jobs" */
export type Jobs_Stddev_Pop_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Jobs_Stddev_Samp_Fields = {
  __typename?: 'jobs_stddev_samp_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_samp() on columns of table "jobs" */
export type Jobs_Stddev_Samp_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "jobs" */
export type Jobs_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Jobs_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Jobs_Stream_Cursor_Value_Input = {
  attempts?: InputMaybe<Scalars['Int']['input']>;
  claimed_at?: InputMaybe<Scalars['timestamptz']['input']>;
  claimed_by?: InputMaybe<Scalars['uuid']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  heartbeat_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  max_attempts?: InputMaybe<Scalars['Int']['input']>;
  parent_job_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  progress?: InputMaybe<Scalars['Float']['input']>;
  progress_note?: InputMaybe<Scalars['String']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
  run_after?: InputMaybe<Scalars['timestamptz']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate sum on columns */
export type Jobs_Sum_Fields = {
  __typename?: 'jobs_sum_fields';
  attempts?: Maybe<Scalars['Int']['output']>;
  max_attempts?: Maybe<Scalars['Int']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by sum() on columns of table "jobs" */
export type Jobs_Sum_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** update columns of table "jobs" */
export enum Jobs_Update_Column {
  /** column name */
  Attempts = 'attempts',
  /** column name */
  ClaimedAt = 'claimed_at',
  /** column name */
  ClaimedBy = 'claimed_by',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Error = 'error',
  /** column name */
  HeartbeatAt = 'heartbeat_at',
  /** column name */
  Id = 'id',
  /** column name */
  MaxAttempts = 'max_attempts',
  /** column name */
  ParentJobId = 'parent_job_id',
  /** column name */
  Payload = 'payload',
  /** column name */
  Priority = 'priority',
  /** column name */
  Progress = 'progress',
  /** column name */
  ProgressNote = 'progress_note',
  /** column name */
  Result = 'result',
  /** column name */
  RunAfter = 'run_after',
  /** column name */
  Status = 'status',
  /** column name */
  Type = 'type',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VideoId = 'video_id'
}

export type Jobs_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Jobs_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Jobs_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Jobs_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Jobs_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Jobs_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Jobs_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Jobs_Set_Input>;
  /** filter the rows which have to be updated */
  where: Jobs_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Jobs_Var_Pop_Fields = {
  __typename?: 'jobs_var_pop_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by var_pop() on columns of table "jobs" */
export type Jobs_Var_Pop_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Jobs_Var_Samp_Fields = {
  __typename?: 'jobs_var_samp_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by var_samp() on columns of table "jobs" */
export type Jobs_Var_Samp_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Jobs_Variance_Fields = {
  __typename?: 'jobs_variance_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by variance() on columns of table "jobs" */
export type Jobs_Variance_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

export type Jsonb_Cast_Exp = {
  String?: InputMaybe<String_Comparison_Exp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: InputMaybe<Jsonb_Cast_Exp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars['jsonb']['input']>;
  _eq?: InputMaybe<Scalars['jsonb']['input']>;
  _gt?: InputMaybe<Scalars['jsonb']['input']>;
  _gte?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars['String']['input']>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars['String']['input']>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars['String']['input']>>;
  _in?: InputMaybe<Array<Scalars['jsonb']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['jsonb']['input']>;
  _lte?: InputMaybe<Scalars['jsonb']['input']>;
  _neq?: InputMaybe<Scalars['jsonb']['input']>;
  _nin?: InputMaybe<Array<Scalars['jsonb']['input']>>;
};

/** Boolean expression to compare columns of type "macaddr". All fields are combined with logical 'AND'. */
export type Macaddr_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['macaddr']['input']>;
  _gt?: InputMaybe<Scalars['macaddr']['input']>;
  _gte?: InputMaybe<Scalars['macaddr']['input']>;
  _in?: InputMaybe<Array<Scalars['macaddr']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['macaddr']['input']>;
  _lte?: InputMaybe<Scalars['macaddr']['input']>;
  _neq?: InputMaybe<Scalars['macaddr']['input']>;
  _nin?: InputMaybe<Array<Scalars['macaddr']['input']>>;
};

/** columns and relationships of "machines" */
export type Machines = {
  __typename?: 'machines';
  capabilities: Array<Scalars['String']['output']>;
  created_at: Scalars['timestamptz']['output'];
  id: Scalars['uuid']['output'];
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  last_seen_at?: Maybe<Scalars['timestamptz']['output']>;
  mac_address?: Maybe<Scalars['macaddr']['output']>;
  name: Scalars['String']['output'];
  os?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  tailscale_ip?: Maybe<Scalars['inet']['output']>;
  wol_via?: Maybe<Scalars['uuid']['output']>;
};


/** columns and relationships of "machines" */
export type MachinesJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "machines" */
export type MachinesJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};

/** aggregated selection of "machines" */
export type Machines_Aggregate = {
  __typename?: 'machines_aggregate';
  aggregate?: Maybe<Machines_Aggregate_Fields>;
  nodes: Array<Machines>;
};

/** aggregate fields of "machines" */
export type Machines_Aggregate_Fields = {
  __typename?: 'machines_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Machines_Max_Fields>;
  min?: Maybe<Machines_Min_Fields>;
};


/** aggregate fields of "machines" */
export type Machines_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Machines_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "machines". All fields are combined with a logical 'AND'. */
export type Machines_Bool_Exp = {
  _and?: InputMaybe<Array<Machines_Bool_Exp>>;
  _not?: InputMaybe<Machines_Bool_Exp>;
  _or?: InputMaybe<Array<Machines_Bool_Exp>>;
  capabilities?: InputMaybe<String_Array_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  jobs?: InputMaybe<Jobs_Bool_Exp>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Bool_Exp>;
  last_seen_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  mac_address?: InputMaybe<Macaddr_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  os?: InputMaybe<String_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  tailscale_ip?: InputMaybe<Inet_Comparison_Exp>;
  wol_via?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "machines" */
export enum Machines_Constraint {
  /** unique or primary key constraint on columns "name" */
  MachinesNameKey = 'machines_name_key',
  /** unique or primary key constraint on columns "id" */
  MachinesPkey = 'machines_pkey'
}

/** input type for inserting data into table "machines" */
export type Machines_Insert_Input = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  jobs?: InputMaybe<Jobs_Arr_Rel_Insert_Input>;
  last_seen_at?: InputMaybe<Scalars['timestamptz']['input']>;
  mac_address?: InputMaybe<Scalars['macaddr']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tailscale_ip?: InputMaybe<Scalars['inet']['input']>;
  wol_via?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Machines_Max_Fields = {
  __typename?: 'machines_max_fields';
  capabilities?: Maybe<Array<Scalars['String']['output']>>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  last_seen_at?: Maybe<Scalars['timestamptz']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  os?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  wol_via?: Maybe<Scalars['uuid']['output']>;
};

/** aggregate min on columns */
export type Machines_Min_Fields = {
  __typename?: 'machines_min_fields';
  capabilities?: Maybe<Array<Scalars['String']['output']>>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  last_seen_at?: Maybe<Scalars['timestamptz']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  os?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  wol_via?: Maybe<Scalars['uuid']['output']>;
};

/** response of any mutation on the table "machines" */
export type Machines_Mutation_Response = {
  __typename?: 'machines_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Machines>;
};

/** input type for inserting object relation for remote table "machines" */
export type Machines_Obj_Rel_Insert_Input = {
  data: Machines_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Machines_On_Conflict>;
};

/** on_conflict condition type for table "machines" */
export type Machines_On_Conflict = {
  constraint: Machines_Constraint;
  update_columns?: Array<Machines_Update_Column>;
  where?: InputMaybe<Machines_Bool_Exp>;
};

/** Ordering options when selecting data from "machines". */
export type Machines_Order_By = {
  capabilities?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Order_By>;
  last_seen_at?: InputMaybe<Order_By>;
  mac_address?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  os?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  tailscale_ip?: InputMaybe<Order_By>;
  wol_via?: InputMaybe<Order_By>;
};

/** primary key columns input for table: machines */
export type Machines_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "machines" */
export enum Machines_Select_Column {
  /** column name */
  Capabilities = 'capabilities',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Id = 'id',
  /** column name */
  LastSeenAt = 'last_seen_at',
  /** column name */
  MacAddress = 'mac_address',
  /** column name */
  Name = 'name',
  /** column name */
  Os = 'os',
  /** column name */
  Status = 'status',
  /** column name */
  TailscaleIp = 'tailscale_ip',
  /** column name */
  WolVia = 'wol_via'
}

/** input type for updating data in table "machines" */
export type Machines_Set_Input = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  last_seen_at?: InputMaybe<Scalars['timestamptz']['input']>;
  mac_address?: InputMaybe<Scalars['macaddr']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tailscale_ip?: InputMaybe<Scalars['inet']['input']>;
  wol_via?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "machines" */
export type Machines_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Machines_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Machines_Stream_Cursor_Value_Input = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  last_seen_at?: InputMaybe<Scalars['timestamptz']['input']>;
  mac_address?: InputMaybe<Scalars['macaddr']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tailscale_ip?: InputMaybe<Scalars['inet']['input']>;
  wol_via?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "machines" */
export enum Machines_Update_Column {
  /** column name */
  Capabilities = 'capabilities',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Id = 'id',
  /** column name */
  LastSeenAt = 'last_seen_at',
  /** column name */
  MacAddress = 'mac_address',
  /** column name */
  Name = 'name',
  /** column name */
  Os = 'os',
  /** column name */
  Status = 'status',
  /** column name */
  TailscaleIp = 'tailscale_ip',
  /** column name */
  WolVia = 'wol_via'
}

export type Machines_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Machines_Set_Input>;
  /** filter the rows which have to be updated */
  where: Machines_Bool_Exp;
};

/** mutation root */
export type Mutation_Root = {
  __typename?: 'mutation_root';
  /** delete data from the table: "assets" */
  delete_assets?: Maybe<Assets_Mutation_Response>;
  /** delete single row from the table: "assets" */
  delete_assets_by_pk?: Maybe<Assets>;
  /** delete data from the table: "jobs" */
  delete_jobs?: Maybe<Jobs_Mutation_Response>;
  /** delete single row from the table: "jobs" */
  delete_jobs_by_pk?: Maybe<Jobs>;
  /** delete data from the table: "machines" */
  delete_machines?: Maybe<Machines_Mutation_Response>;
  /** delete single row from the table: "machines" */
  delete_machines_by_pk?: Maybe<Machines>;
  /** delete data from the table: "videos" */
  delete_videos?: Maybe<Videos_Mutation_Response>;
  /** delete single row from the table: "videos" */
  delete_videos_by_pk?: Maybe<Videos>;
  /** insert data into the table: "assets" */
  insert_assets?: Maybe<Assets_Mutation_Response>;
  /** insert a single row into the table: "assets" */
  insert_assets_one?: Maybe<Assets>;
  /** insert data into the table: "jobs" */
  insert_jobs?: Maybe<Jobs_Mutation_Response>;
  /** insert a single row into the table: "jobs" */
  insert_jobs_one?: Maybe<Jobs>;
  /** insert data into the table: "machines" */
  insert_machines?: Maybe<Machines_Mutation_Response>;
  /** insert a single row into the table: "machines" */
  insert_machines_one?: Maybe<Machines>;
  /** insert data into the table: "videos" */
  insert_videos?: Maybe<Videos_Mutation_Response>;
  /** insert a single row into the table: "videos" */
  insert_videos_one?: Maybe<Videos>;
  /** update data of the table: "assets" */
  update_assets?: Maybe<Assets_Mutation_Response>;
  /** update single row of the table: "assets" */
  update_assets_by_pk?: Maybe<Assets>;
  /** update multiples rows of table: "assets" */
  update_assets_many?: Maybe<Array<Maybe<Assets_Mutation_Response>>>;
  /** update data of the table: "jobs" */
  update_jobs?: Maybe<Jobs_Mutation_Response>;
  /** update single row of the table: "jobs" */
  update_jobs_by_pk?: Maybe<Jobs>;
  /** update multiples rows of table: "jobs" */
  update_jobs_many?: Maybe<Array<Maybe<Jobs_Mutation_Response>>>;
  /** update data of the table: "machines" */
  update_machines?: Maybe<Machines_Mutation_Response>;
  /** update single row of the table: "machines" */
  update_machines_by_pk?: Maybe<Machines>;
  /** update multiples rows of table: "machines" */
  update_machines_many?: Maybe<Array<Maybe<Machines_Mutation_Response>>>;
  /** update data of the table: "videos" */
  update_videos?: Maybe<Videos_Mutation_Response>;
  /** update single row of the table: "videos" */
  update_videos_by_pk?: Maybe<Videos>;
  /** update multiples rows of table: "videos" */
  update_videos_many?: Maybe<Array<Maybe<Videos_Mutation_Response>>>;
};


/** mutation root */
export type Mutation_RootDelete_AssetsArgs = {
  where: Assets_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Assets_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_JobsArgs = {
  where: Jobs_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Jobs_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_MachinesArgs = {
  where: Machines_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Machines_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_VideosArgs = {
  where: Videos_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Videos_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootInsert_AssetsArgs = {
  objects: Array<Assets_Insert_Input>;
  on_conflict?: InputMaybe<Assets_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Assets_OneArgs = {
  object: Assets_Insert_Input;
  on_conflict?: InputMaybe<Assets_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_JobsArgs = {
  objects: Array<Jobs_Insert_Input>;
  on_conflict?: InputMaybe<Jobs_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Jobs_OneArgs = {
  object: Jobs_Insert_Input;
  on_conflict?: InputMaybe<Jobs_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_MachinesArgs = {
  objects: Array<Machines_Insert_Input>;
  on_conflict?: InputMaybe<Machines_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Machines_OneArgs = {
  object: Machines_Insert_Input;
  on_conflict?: InputMaybe<Machines_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_VideosArgs = {
  objects: Array<Videos_Insert_Input>;
  on_conflict?: InputMaybe<Videos_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Videos_OneArgs = {
  object: Videos_Insert_Input;
  on_conflict?: InputMaybe<Videos_On_Conflict>;
};


/** mutation root */
export type Mutation_RootUpdate_AssetsArgs = {
  _append?: InputMaybe<Assets_Append_Input>;
  _delete_at_path?: InputMaybe<Assets_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Assets_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Assets_Delete_Key_Input>;
  _prepend?: InputMaybe<Assets_Prepend_Input>;
  _set?: InputMaybe<Assets_Set_Input>;
  where: Assets_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Assets_By_PkArgs = {
  _append?: InputMaybe<Assets_Append_Input>;
  _delete_at_path?: InputMaybe<Assets_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Assets_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Assets_Delete_Key_Input>;
  _prepend?: InputMaybe<Assets_Prepend_Input>;
  _set?: InputMaybe<Assets_Set_Input>;
  pk_columns: Assets_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Assets_ManyArgs = {
  updates: Array<Assets_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_JobsArgs = {
  _append?: InputMaybe<Jobs_Append_Input>;
  _delete_at_path?: InputMaybe<Jobs_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Jobs_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Jobs_Delete_Key_Input>;
  _inc?: InputMaybe<Jobs_Inc_Input>;
  _prepend?: InputMaybe<Jobs_Prepend_Input>;
  _set?: InputMaybe<Jobs_Set_Input>;
  where: Jobs_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Jobs_By_PkArgs = {
  _append?: InputMaybe<Jobs_Append_Input>;
  _delete_at_path?: InputMaybe<Jobs_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Jobs_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Jobs_Delete_Key_Input>;
  _inc?: InputMaybe<Jobs_Inc_Input>;
  _prepend?: InputMaybe<Jobs_Prepend_Input>;
  _set?: InputMaybe<Jobs_Set_Input>;
  pk_columns: Jobs_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Jobs_ManyArgs = {
  updates: Array<Jobs_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_MachinesArgs = {
  _set?: InputMaybe<Machines_Set_Input>;
  where: Machines_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Machines_By_PkArgs = {
  _set?: InputMaybe<Machines_Set_Input>;
  pk_columns: Machines_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Machines_ManyArgs = {
  updates: Array<Machines_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_VideosArgs = {
  _append?: InputMaybe<Videos_Append_Input>;
  _delete_at_path?: InputMaybe<Videos_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Videos_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Videos_Delete_Key_Input>;
  _inc?: InputMaybe<Videos_Inc_Input>;
  _prepend?: InputMaybe<Videos_Prepend_Input>;
  _set?: InputMaybe<Videos_Set_Input>;
  where: Videos_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Videos_By_PkArgs = {
  _append?: InputMaybe<Videos_Append_Input>;
  _delete_at_path?: InputMaybe<Videos_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Videos_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Videos_Delete_Key_Input>;
  _inc?: InputMaybe<Videos_Inc_Input>;
  _prepend?: InputMaybe<Videos_Prepend_Input>;
  _set?: InputMaybe<Videos_Set_Input>;
  pk_columns: Videos_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Videos_ManyArgs = {
  updates: Array<Videos_Updates>;
};

/** column ordering options */
export enum Order_By {
  /** in ascending order, nulls last */
  Asc = 'asc',
  /** in ascending order, nulls first */
  AscNullsFirst = 'asc_nulls_first',
  /** in ascending order, nulls last */
  AscNullsLast = 'asc_nulls_last',
  /** in descending order, nulls first */
  Desc = 'desc',
  /** in descending order, nulls first */
  DescNullsFirst = 'desc_nulls_first',
  /** in descending order, nulls last */
  DescNullsLast = 'desc_nulls_last'
}

export type Query_Root = {
  __typename?: 'query_root';
  /** An array relationship */
  assets: Array<Assets>;
  /** An aggregate relationship */
  assets_aggregate: Assets_Aggregate;
  /** fetch data from the table: "assets" using primary key columns */
  assets_by_pk?: Maybe<Assets>;
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  /** fetch data from the table: "jobs" using primary key columns */
  jobs_by_pk?: Maybe<Jobs>;
  /** fetch data from the table: "machines" */
  machines: Array<Machines>;
  /** fetch aggregated fields from the table: "machines" */
  machines_aggregate: Machines_Aggregate;
  /** fetch data from the table: "machines" using primary key columns */
  machines_by_pk?: Maybe<Machines>;
  /** fetch data from the table: "videos" */
  videos: Array<Videos>;
  /** fetch aggregated fields from the table: "videos" */
  videos_aggregate: Videos_Aggregate;
  /** fetch data from the table: "videos" using primary key columns */
  videos_by_pk?: Maybe<Videos>;
};


export type Query_RootAssetsArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Query_RootAssets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Query_RootAssets_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Query_RootJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Query_RootJobs_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootMachinesArgs = {
  distinct_on?: InputMaybe<Array<Machines_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Machines_Order_By>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Query_RootMachines_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Machines_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Machines_Order_By>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Query_RootMachines_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootVideosArgs = {
  distinct_on?: InputMaybe<Array<Videos_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Videos_Order_By>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};


export type Query_RootVideos_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Videos_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Videos_Order_By>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};


export type Query_RootVideos_By_PkArgs = {
  id: Scalars['uuid']['input'];
};

export type Subscription_Root = {
  __typename?: 'subscription_root';
  /** An array relationship */
  assets: Array<Assets>;
  /** An aggregate relationship */
  assets_aggregate: Assets_Aggregate;
  /** fetch data from the table: "assets" using primary key columns */
  assets_by_pk?: Maybe<Assets>;
  /** fetch data from the table in a streaming manner: "assets" */
  assets_stream: Array<Assets>;
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  /** fetch data from the table: "jobs" using primary key columns */
  jobs_by_pk?: Maybe<Jobs>;
  /** fetch data from the table in a streaming manner: "jobs" */
  jobs_stream: Array<Jobs>;
  /** fetch data from the table: "machines" */
  machines: Array<Machines>;
  /** fetch aggregated fields from the table: "machines" */
  machines_aggregate: Machines_Aggregate;
  /** fetch data from the table: "machines" using primary key columns */
  machines_by_pk?: Maybe<Machines>;
  /** fetch data from the table in a streaming manner: "machines" */
  machines_stream: Array<Machines>;
  /** fetch data from the table: "videos" */
  videos: Array<Videos>;
  /** fetch aggregated fields from the table: "videos" */
  videos_aggregate: Videos_Aggregate;
  /** fetch data from the table: "videos" using primary key columns */
  videos_by_pk?: Maybe<Videos>;
  /** fetch data from the table in a streaming manner: "videos" */
  videos_stream: Array<Videos>;
};


export type Subscription_RootAssetsArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Subscription_RootAssets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Subscription_RootAssets_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootAssets_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Assets_Stream_Cursor_Input>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Subscription_RootJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Subscription_RootJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Subscription_RootJobs_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootJobs_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Jobs_Stream_Cursor_Input>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Subscription_RootMachinesArgs = {
  distinct_on?: InputMaybe<Array<Machines_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Machines_Order_By>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Subscription_RootMachines_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Machines_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Machines_Order_By>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Subscription_RootMachines_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootMachines_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Machines_Stream_Cursor_Input>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Subscription_RootVideosArgs = {
  distinct_on?: InputMaybe<Array<Videos_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Videos_Order_By>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};


export type Subscription_RootVideos_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Videos_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Videos_Order_By>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};


export type Subscription_RootVideos_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootVideos_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Videos_Stream_Cursor_Input>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['timestamptz']['input']>;
  _gt?: InputMaybe<Scalars['timestamptz']['input']>;
  _gte?: InputMaybe<Scalars['timestamptz']['input']>;
  _in?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['timestamptz']['input']>;
  _lte?: InputMaybe<Scalars['timestamptz']['input']>;
  _neq?: InputMaybe<Scalars['timestamptz']['input']>;
  _nin?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['uuid']['input']>;
  _gt?: InputMaybe<Scalars['uuid']['input']>;
  _gte?: InputMaybe<Scalars['uuid']['input']>;
  _in?: InputMaybe<Array<Scalars['uuid']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['uuid']['input']>;
  _lte?: InputMaybe<Scalars['uuid']['input']>;
  _neq?: InputMaybe<Scalars['uuid']['input']>;
  _nin?: InputMaybe<Array<Scalars['uuid']['input']>>;
};

/** columns and relationships of "videos" */
export type Videos = {
  __typename?: 'videos';
  /** An array relationship */
  assets: Array<Assets>;
  /** An aggregate relationship */
  assets_aggregate: Assets_Aggregate;
  channel?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['timestamptz']['output'];
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['uuid']['output'];
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  meta: Scalars['jsonb']['output'];
  size_bytes?: Maybe<Scalars['bigint']['output']>;
  source: Scalars['String']['output'];
  status: Scalars['String']['output'];
  storage_path?: Maybe<Scalars['String']['output']>;
  thumb_path?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
  vcodec?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};


/** columns and relationships of "videos" */
export type VideosAssetsArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosAssets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosMetaArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "videos" */
export type Videos_Aggregate = {
  __typename?: 'videos_aggregate';
  aggregate?: Maybe<Videos_Aggregate_Fields>;
  nodes: Array<Videos>;
};

/** aggregate fields of "videos" */
export type Videos_Aggregate_Fields = {
  __typename?: 'videos_aggregate_fields';
  avg?: Maybe<Videos_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Videos_Max_Fields>;
  min?: Maybe<Videos_Min_Fields>;
  stddev?: Maybe<Videos_Stddev_Fields>;
  stddev_pop?: Maybe<Videos_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Videos_Stddev_Samp_Fields>;
  sum?: Maybe<Videos_Sum_Fields>;
  var_pop?: Maybe<Videos_Var_Pop_Fields>;
  var_samp?: Maybe<Videos_Var_Samp_Fields>;
  variance?: Maybe<Videos_Variance_Fields>;
};


/** aggregate fields of "videos" */
export type Videos_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Videos_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Videos_Append_Input = {
  meta?: InputMaybe<Scalars['jsonb']['input']>;
};

/** aggregate avg on columns */
export type Videos_Avg_Fields = {
  __typename?: 'videos_avg_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "videos". All fields are combined with a logical 'AND'. */
export type Videos_Bool_Exp = {
  _and?: InputMaybe<Array<Videos_Bool_Exp>>;
  _not?: InputMaybe<Videos_Bool_Exp>;
  _or?: InputMaybe<Array<Videos_Bool_Exp>>;
  assets?: InputMaybe<Assets_Bool_Exp>;
  assets_aggregate?: InputMaybe<Assets_Aggregate_Bool_Exp>;
  channel?: InputMaybe<String_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  duration?: InputMaybe<Float_Comparison_Exp>;
  height?: InputMaybe<Int_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  jobs?: InputMaybe<Jobs_Bool_Exp>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Bool_Exp>;
  meta?: InputMaybe<Jsonb_Comparison_Exp>;
  size_bytes?: InputMaybe<Bigint_Comparison_Exp>;
  source?: InputMaybe<String_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  storage_path?: InputMaybe<String_Comparison_Exp>;
  thumb_path?: InputMaybe<String_Comparison_Exp>;
  title?: InputMaybe<String_Comparison_Exp>;
  url?: InputMaybe<String_Comparison_Exp>;
  vcodec?: InputMaybe<String_Comparison_Exp>;
  width?: InputMaybe<Int_Comparison_Exp>;
  youtube_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "videos" */
export enum Videos_Constraint {
  /** unique or primary key constraint on columns "id" */
  VideosPkey = 'videos_pkey',
  /** unique or primary key constraint on columns "youtube_id" */
  VideosYoutubeIdKey = 'videos_youtube_id_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Videos_Delete_At_Path_Input = {
  meta?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Videos_Delete_Elem_Input = {
  meta?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Videos_Delete_Key_Input = {
  meta?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "videos" */
export type Videos_Inc_Input = {
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  size_bytes?: InputMaybe<Scalars['bigint']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "videos" */
export type Videos_Insert_Input = {
  assets?: InputMaybe<Assets_Arr_Rel_Insert_Input>;
  channel?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  jobs?: InputMaybe<Jobs_Arr_Rel_Insert_Input>;
  meta?: InputMaybe<Scalars['jsonb']['input']>;
  size_bytes?: InputMaybe<Scalars['bigint']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  storage_path?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  vcodec?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Videos_Max_Fields = {
  __typename?: 'videos_max_fields';
  channel?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  size_bytes?: Maybe<Scalars['bigint']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  storage_path?: Maybe<Scalars['String']['output']>;
  thumb_path?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  vcodec?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Videos_Min_Fields = {
  __typename?: 'videos_min_fields';
  channel?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  size_bytes?: Maybe<Scalars['bigint']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  storage_path?: Maybe<Scalars['String']['output']>;
  thumb_path?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  vcodec?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "videos" */
export type Videos_Mutation_Response = {
  __typename?: 'videos_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Videos>;
};

/** input type for inserting object relation for remote table "videos" */
export type Videos_Obj_Rel_Insert_Input = {
  data: Videos_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Videos_On_Conflict>;
};

/** on_conflict condition type for table "videos" */
export type Videos_On_Conflict = {
  constraint: Videos_Constraint;
  update_columns?: Array<Videos_Update_Column>;
  where?: InputMaybe<Videos_Bool_Exp>;
};

/** Ordering options when selecting data from "videos". */
export type Videos_Order_By = {
  assets_aggregate?: InputMaybe<Assets_Aggregate_Order_By>;
  channel?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  duration?: InputMaybe<Order_By>;
  height?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Order_By>;
  meta?: InputMaybe<Order_By>;
  size_bytes?: InputMaybe<Order_By>;
  source?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  storage_path?: InputMaybe<Order_By>;
  thumb_path?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  url?: InputMaybe<Order_By>;
  vcodec?: InputMaybe<Order_By>;
  width?: InputMaybe<Order_By>;
  youtube_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: videos */
export type Videos_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Videos_Prepend_Input = {
  meta?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "videos" */
export enum Videos_Select_Column {
  /** column name */
  Channel = 'channel',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Duration = 'duration',
  /** column name */
  Height = 'height',
  /** column name */
  Id = 'id',
  /** column name */
  Meta = 'meta',
  /** column name */
  SizeBytes = 'size_bytes',
  /** column name */
  Source = 'source',
  /** column name */
  Status = 'status',
  /** column name */
  StoragePath = 'storage_path',
  /** column name */
  ThumbPath = 'thumb_path',
  /** column name */
  Title = 'title',
  /** column name */
  Url = 'url',
  /** column name */
  Vcodec = 'vcodec',
  /** column name */
  Width = 'width',
  /** column name */
  YoutubeId = 'youtube_id'
}

/** input type for updating data in table "videos" */
export type Videos_Set_Input = {
  channel?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  meta?: InputMaybe<Scalars['jsonb']['input']>;
  size_bytes?: InputMaybe<Scalars['bigint']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  storage_path?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  vcodec?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type Videos_Stddev_Fields = {
  __typename?: 'videos_stddev_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Videos_Stddev_Pop_Fields = {
  __typename?: 'videos_stddev_pop_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Videos_Stddev_Samp_Fields = {
  __typename?: 'videos_stddev_samp_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "videos" */
export type Videos_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Videos_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Videos_Stream_Cursor_Value_Input = {
  channel?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  meta?: InputMaybe<Scalars['jsonb']['input']>;
  size_bytes?: InputMaybe<Scalars['bigint']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  storage_path?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  vcodec?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type Videos_Sum_Fields = {
  __typename?: 'videos_sum_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  size_bytes?: Maybe<Scalars['bigint']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

/** update columns of table "videos" */
export enum Videos_Update_Column {
  /** column name */
  Channel = 'channel',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Duration = 'duration',
  /** column name */
  Height = 'height',
  /** column name */
  Id = 'id',
  /** column name */
  Meta = 'meta',
  /** column name */
  SizeBytes = 'size_bytes',
  /** column name */
  Source = 'source',
  /** column name */
  Status = 'status',
  /** column name */
  StoragePath = 'storage_path',
  /** column name */
  ThumbPath = 'thumb_path',
  /** column name */
  Title = 'title',
  /** column name */
  Url = 'url',
  /** column name */
  Vcodec = 'vcodec',
  /** column name */
  Width = 'width',
  /** column name */
  YoutubeId = 'youtube_id'
}

export type Videos_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Videos_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Videos_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Videos_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Videos_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Videos_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Videos_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Videos_Set_Input>;
  /** filter the rows which have to be updated */
  where: Videos_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Videos_Var_Pop_Fields = {
  __typename?: 'videos_var_pop_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Videos_Var_Samp_Fields = {
  __typename?: 'videos_var_samp_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Videos_Variance_Fields = {
  __typename?: 'videos_variance_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

export type MachinesSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MachinesSubscription = { __typename?: 'subscription_root', machines: Array<{ __typename?: 'machines', id: string, name: string, os?: string | null, capabilities: Array<string>, status: string, tailscale_ip?: string | null, last_seen_at?: string | null }> };


export const MachinesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"Machines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"machines"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"os"}},{"kind":"Field","name":{"kind":"Name","value":"capabilities"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"tailscale_ip"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<MachinesSubscription, MachinesSubscriptionVariables>;